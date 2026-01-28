/**
 * Recommendation Engine Service
 * 규칙 추천 시스템
 */

import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

interface RecommendationContext {
  userId?: string;
  teamId?: string;
  currentRuleId?: string;
  category?: string;
  tags?: string[];
}

interface ScoredRule {
  ruleId: string;
  score: number;
  reasons: string[];
}

interface RecommendationConfig {
  weights: {
    tagSimilarity: number;
    categorySimilarity: number;
    collaborativeFiltering: number;
    popularity: number;
    recency: number;
  };
  minScore: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: RecommendationConfig = {
  weights: {
    tagSimilarity: 3.0,
    categorySimilarity: 2.0,
    collaborativeFiltering: 2.5,
    popularity: 1.0,
    recency: 0.5,
  },
  minScore: 0.1,
};

// ============================================================================
// Recommendation Service
// ============================================================================

export class RecommendationService {
  private config: RecommendationConfig;
  private cache: Map<string, { recommendations: unknown[]; timestamp: number }> = new Map();
  private cacheTTL = 10 * 60 * 1000; // 10 minutes

  constructor(config: Partial<RecommendationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get recommendations for a user
   */
  async getRecommendationsForUser(
    userId: string,
    options: { limit?: number; excludeAdopted?: boolean } = {}
  ): Promise<unknown[]> {
    const { limit = 10, excludeAdopted = true } = options;

    // Get user's team memberships and adopted rules
    const [memberships, adoptedRules, favoriteRules] = await Promise.all([
      prisma.teamMember.findMany({
        where: { userId },
        include: {
          team: {
            include: {
              rules: {
                where: { visibility: 'PUBLIC' },
                select: { category: true, tags: true },
              },
            },
          },
        },
      }),
      prisma.ruleAdoption.findMany({
        where: {
          adopterTeam: {
            members: { some: { userId } },
          },
        },
        select: { ruleId: true },
      }),
      prisma.favorite.findMany({
        where: { userId, type: 'RULE' },
        select: { targetId: true },
      }),
    ]);

    const adoptedRuleIds = adoptedRules.map((a) => a.ruleId);
    const favoriteRuleIds = favoriteRules.map((f) => f.targetId);

    // Collect user's interests from their team's rules
    const userCategories = new Set<string>();
    const userTags = new Set<string>();

    for (const membership of memberships) {
      for (const rule of membership.team.rules) {
        userCategories.add(rule.category);
        rule.tags.forEach((tag) => userTags.add(tag));
      }
    }

    // Get candidate rules
    const where: Record<string, unknown> = {
      visibility: 'PUBLIC',
      listedInMarketplace: true,
      archivedAt: null,
    };

    if (excludeAdopted && adoptedRuleIds.length > 0) {
      where.id = { notIn: adoptedRuleIds };
    }

    const candidateRules = await prisma.rule.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        team: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { adoptions: true, reviews: true },
        },
      },
    });

    // Score each rule
    const scoredRules: ScoredRule[] = [];

    for (const rule of candidateRules) {
      const reasons: string[] = [];
      let score = 0;

      // Tag similarity
      const commonTags = rule.tags.filter((tag) => userTags.has(tag));
      if (commonTags.length > 0) {
        const tagScore = (commonTags.length / Math.max(rule.tags.length, 1)) * this.config.weights.tagSimilarity;
        score += tagScore;
        reasons.push(`Similar tags: ${commonTags.slice(0, 3).join(', ')}`);
      }

      // Category similarity
      if (userCategories.has(rule.category)) {
        score += this.config.weights.categorySimilarity;
        reasons.push(`In category: ${rule.category}`);
      }

      // Popularity score
      const popularityScore = Math.log10(rule.downloads + 1) / 4 * this.config.weights.popularity;
      score += popularityScore;
      if (rule.downloads > 100) {
        reasons.push(`Popular: ${rule.downloads} downloads`);
      }

      // Rating bonus
      if (rule.rating >= 4) {
        score += rule.rating / 5;
        reasons.push(`Highly rated: ${rule.rating.toFixed(1)}`);
      }

      // Recency bonus
      if (rule.publishedAt) {
        const daysSincePublish = Math.floor((Date.now() - rule.publishedAt.getTime()) / (24 * 60 * 60 * 1000));
        if (daysSincePublish < 30) {
          const recencyScore = (1 - daysSincePublish / 30) * this.config.weights.recency;
          score += recencyScore;
          reasons.push('Recently published');
        }
      }

      // Favorite bonus
      if (favoriteRuleIds.includes(rule.id)) {
        score += 0.5;
        reasons.push('In your favorites');
      }

      if (score >= this.config.minScore) {
        scoredRules.push({
          ruleId: rule.id,
          score,
          reasons,
        });
      }
    }

    // Sort by score
    scoredRules.sort((a, b) => b.score - a.score);

    // Get top rules with full data
    const topRuleIds = scoredRules.slice(0, limit).map((r) => r.ruleId);
    const scoreMap = new Map(scoredRules.map((r) => [r.ruleId, r]));

    const result = candidateRules
      .filter((r) => topRuleIds.includes(r.id))
      .map((rule) => ({
        ...rule,
        recommendation: scoreMap.get(rule.id),
      }))
      .sort((a, b) => (b.recommendation?.score || 0) - (a.recommendation?.score || 0));

    return result;
  }

  /**
   * Get similar rules (collaborative filtering)
   */
  async getSimilarRules(ruleId: string, options: { limit?: number } = {}): Promise<unknown[]> {
    const { limit = 10 } = options;

    const cacheKey = `similar:${ruleId}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.recommendations;
    }

    const rule = await prisma.rule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      return [];
    }

    // Find teams that adopted this rule
    const adoptingTeams = await prisma.ruleAdoption.findMany({
      where: { ruleId },
      select: { adopterTeamId: true },
    });

    const adoptingTeamIds = adoptingTeams.map((a) => a.adopterTeamId);

    // Find other rules adopted by those teams
    const coAdoptedRules = await prisma.ruleAdoption.findMany({
      where: {
        adopterTeamId: { in: adoptingTeamIds },
        ruleId: { not: ruleId },
      },
      select: { ruleId: true },
    });

    const coAdoptionCounts = new Map<string, number>();
    for (const adoption of coAdoptedRules) {
      coAdoptionCounts.set(adoption.ruleId, (coAdoptionCounts.get(adoption.ruleId) || 0) + 1);
    }

    // Get rules with similar tags
    const candidateRules = await prisma.rule.findMany({
      where: {
        id: { not: ruleId },
        visibility: 'PUBLIC',
        listedInMarketplace: true,
        archivedAt: null,
        OR: [
          { id: { in: Array.from(coAdoptionCounts.keys()) } },
          { category: rule.category },
          { tags: { hasSome: rule.tags } },
        ],
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        team: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Score similar rules
    const scoredRules = candidateRules.map((candidate) => {
      const reasons: string[] = [];
      let score = 0;

      // Co-adoption score (collaborative filtering)
      const coAdoptions = coAdoptionCounts.get(candidate.id) || 0;
      if (coAdoptions > 0) {
        score += (coAdoptions / adoptingTeamIds.length) * this.config.weights.collaborativeFiltering;
        reasons.push(`Adopted together by ${coAdoptions} team(s)`);
      }

      // Same category
      if (candidate.category === rule.category) {
        score += this.config.weights.categorySimilarity;
        reasons.push(`Same category: ${rule.category}`);
      }

      // Tag overlap
      const commonTags = candidate.tags.filter((tag) => rule.tags.includes(tag));
      if (commonTags.length > 0) {
        score += (commonTags.length / rule.tags.length) * this.config.weights.tagSimilarity;
        reasons.push(`Similar tags: ${commonTags.slice(0, 3).join(', ')}`);
      }

      // Same author
      if (candidate.authorId === rule.authorId) {
        score += 0.5;
        reasons.push('Same author');
      }

      return {
        ...candidate,
        similarity: { score, reasons },
      };
    });

    scoredRules.sort((a, b) => b.similarity.score - a.similarity.score);
    const result = scoredRules.slice(0, limit);

    this.cache.set(cacheKey, { recommendations: result, timestamp: Date.now() });

    return result;
  }

  /**
   * Get recommendations for a team
   */
  async getRecommendationsForTeam(teamId: string, options: { limit?: number } = {}): Promise<unknown[]> {
    const { limit = 10 } = options;

    // Get team's current rules and adoptions
    const [teamRules, adoptedRules] = await Promise.all([
      prisma.rule.findMany({
        where: { teamId },
        select: { category: true, tags: true },
      }),
      prisma.ruleAdoption.findMany({
        where: { adopterTeamId: teamId },
        select: { ruleId: true },
      }),
    ]);

    const adoptedRuleIds = adoptedRules.map((a) => a.ruleId);

    // Collect team's interests
    const teamCategories = new Set(teamRules.map((r) => r.category));
    const teamTags = new Set(teamRules.flatMap((r) => r.tags));

    // Get similar teams based on rule categories and tags
    const similarTeams = await prisma.team.findMany({
      where: {
        id: { not: teamId },
        rules: {
          some: {
            OR: [
              { category: { in: Array.from(teamCategories) } },
              { tags: { hasSome: Array.from(teamTags) } },
            ],
          },
        },
      },
      select: { id: true },
    });

    const similarTeamIds = similarTeams.map((t) => t.id);

    // Find rules adopted by similar teams
    const recommendedByPeers = await prisma.ruleAdoption.findMany({
      where: {
        adopterTeamId: { in: similarTeamIds },
        ruleId: { notIn: adoptedRuleIds },
      },
      select: { ruleId: true },
    });

    const peerRecommendationCounts = new Map<string, number>();
    for (const rec of recommendedByPeers) {
      peerRecommendationCounts.set(rec.ruleId, (peerRecommendationCounts.get(rec.ruleId) || 0) + 1);
    }

    // Get candidate rules
    const candidateRules = await prisma.rule.findMany({
      where: {
        id: { notIn: adoptedRuleIds },
        visibility: 'PUBLIC',
        listedInMarketplace: true,
        archivedAt: null,
        OR: [
          { id: { in: Array.from(peerRecommendationCounts.keys()) } },
          { category: { in: Array.from(teamCategories) } },
          { tags: { hasSome: Array.from(teamTags) } },
        ],
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        team: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { adoptions: true },
        },
      },
    });

    // Score rules
    const scoredRules = candidateRules.map((rule) => {
      const reasons: string[] = [];
      let score = 0;

      // Peer adoption score
      const peerAdoptions = peerRecommendationCounts.get(rule.id) || 0;
      if (peerAdoptions > 0) {
        score += (peerAdoptions / similarTeamIds.length) * 3;
        reasons.push(`Adopted by ${peerAdoptions} similar team(s)`);
      }

      // Category match
      if (teamCategories.has(rule.category)) {
        score += this.config.weights.categorySimilarity;
        reasons.push(`Matches your category: ${rule.category}`);
      }

      // Tag overlap
      const commonTags = rule.tags.filter((tag) => teamTags.has(tag));
      if (commonTags.length > 0) {
        score += (commonTags.length / Math.max(rule.tags.length, 1)) * this.config.weights.tagSimilarity;
        reasons.push(`Related tags: ${commonTags.slice(0, 3).join(', ')}`);
      }

      return {
        ...rule,
        recommendation: { score, reasons },
      };
    });

    scoredRules.sort((a, b) => b.recommendation.score - a.recommendation.score);

    return scoredRules.slice(0, limit);
  }

  /**
   * Get "You might also like" recommendations
   */
  async getYouMightAlsoLike(context: RecommendationContext, limit = 5): Promise<unknown[]> {
    const { currentRuleId, category, tags } = context;

    const where: Record<string, unknown> = {
      visibility: 'PUBLIC',
      listedInMarketplace: true,
      archivedAt: null,
    };

    if (currentRuleId) {
      where.id = { not: currentRuleId };
    }

    const orConditions: unknown[] = [];

    if (category) {
      orConditions.push({ category });
    }

    if (tags && tags.length > 0) {
      orConditions.push({ tags: { hasSome: tags } });
    }

    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    const rules = await prisma.rule.findMany({
      where,
      orderBy: [
        { downloads: 'desc' },
        { rating: 'desc' },
      ],
      take: limit * 2,
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        team: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Diversify by category
    const seenCategories = new Set<string>();
    const diversified: typeof rules = [];

    for (const rule of rules) {
      if (diversified.length >= limit) break;
      if (!seenCategories.has(rule.category) || diversified.length < limit / 2) {
        diversified.push(rule);
        seenCategories.add(rule.category);
      }
    }

    return diversified;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Recommendation cache cleared');
  }
}

// Singleton instance
export const recommendationService = new RecommendationService();

export default recommendationService;
