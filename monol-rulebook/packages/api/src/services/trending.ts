/**
 * Trending Service
 * 트렌딩 규칙 계산 및 관리
 */

import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

interface TrendingScore {
  ruleId: string;
  score: number;
  downloads: number;
  views: number;
  adoptions: number;
  reviews: number;
  avgRating: number;
  recency: number;
}

interface TrendingConfig {
  weights: {
    downloads: number;
    views: number;
    adoptions: number;
    reviews: number;
    rating: number;
    recency: number;
  };
  timeWindowDays: number;
  decayFactor: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: TrendingConfig = {
  weights: {
    downloads: 1.0,
    views: 0.1,
    adoptions: 2.0,
    reviews: 1.5,
    rating: 3.0,
    recency: 0.5,
  },
  timeWindowDays: 7,
  decayFactor: 0.9,
};

// ============================================================================
// Trending Service
// ============================================================================

export class TrendingService {
  private config: TrendingConfig;
  private cache: Map<string, { rules: unknown[]; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<TrendingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate trending score for a rule
   */
  calculateScore(metrics: {
    downloads: number;
    views: number;
    adoptions: number;
    reviews: number;
    avgRating: number;
    daysSincePublish: number;
  }): number {
    const { weights, decayFactor } = this.config;

    // Normalize values
    const normalizedDownloads = Math.log10(metrics.downloads + 1);
    const normalizedViews = Math.log10(metrics.views + 1);
    const normalizedAdoptions = Math.log10(metrics.adoptions + 1);
    const normalizedReviews = Math.log10(metrics.reviews + 1);
    const normalizedRating = metrics.avgRating / 5;

    // Time decay (more recent = higher score)
    const recencyScore = Math.pow(decayFactor, metrics.daysSincePublish / 7);

    // Calculate weighted score
    const score =
      weights.downloads * normalizedDownloads +
      weights.views * normalizedViews +
      weights.adoptions * normalizedAdoptions +
      weights.reviews * normalizedReviews +
      weights.rating * normalizedRating +
      weights.recency * recencyScore;

    return Math.round(score * 1000) / 1000;
  }

  /**
   * Get trending rules
   */
  async getTrendingRules(options: {
    limit?: number;
    category?: string;
    tags?: string[];
    excludeIds?: string[];
  } = {}): Promise<unknown[]> {
    const { limit = 10, category, tags, excludeIds = [] } = options;

    // Check cache
    const cacheKey = JSON.stringify(options);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.rules;
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.timeWindowDays * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      visibility: 'PUBLIC',
      listedInMarketplace: true,
      archivedAt: null,
      publishedAt: { not: null },
    };

    if (category) {
      where.category = { startsWith: category };
    }

    if (tags && tags.length > 0) {
      where.tags = { hasEvery: tags };
    }

    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds };
    }

    // Fetch rules with metrics
    const rules = await prisma.rule.findMany({
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

    // Get recent activity counts
    const recentActivityPromises = rules.map(async (rule) => {
      const [recentDownloads, recentViews] = await Promise.all([
        // Recent adoptions as proxy for downloads
        prisma.ruleAdoption.count({
          where: {
            ruleId: rule.id,
            createdAt: { gte: windowStart },
          },
        }),
        // Recent analytics events
        prisma.analyticsEvent.count({
          where: {
            ruleId: rule.id,
            eventType: 'RULE_VIEW',
            createdAt: { gte: windowStart },
          },
        }),
      ]);

      return { ruleId: rule.id, recentDownloads, recentViews };
    });

    const recentActivity = await Promise.all(recentActivityPromises);
    const activityMap = new Map(recentActivity.map((a) => [a.ruleId, a]));

    // Calculate scores
    const scoredRules: TrendingScore[] = rules.map((rule) => {
      const activity = activityMap.get(rule.id) || { recentDownloads: 0, recentViews: 0 };
      const daysSincePublish = rule.publishedAt
        ? Math.floor((now.getTime() - rule.publishedAt.getTime()) / (24 * 60 * 60 * 1000))
        : 365;

      return {
        ruleId: rule.id,
        score: this.calculateScore({
          downloads: rule.downloads + activity.recentDownloads * 2, // Boost recent activity
          views: activity.recentViews,
          adoptions: rule._count.adoptions,
          reviews: rule._count.reviews,
          avgRating: rule.rating,
          daysSincePublish,
        }),
        downloads: rule.downloads,
        views: activity.recentViews,
        adoptions: rule._count.adoptions,
        reviews: rule._count.reviews,
        avgRating: rule.rating,
        recency: daysSincePublish,
      };
    });

    // Sort by score
    scoredRules.sort((a, b) => b.score - a.score);

    // Get top rules
    const topRuleIds = scoredRules.slice(0, limit).map((r) => r.ruleId);
    const scoreMap = new Map(scoredRules.map((r) => [r.ruleId, r]));

    const result = rules
      .filter((r) => topRuleIds.includes(r.id))
      .map((rule) => ({
        ...rule,
        trendingScore: scoreMap.get(rule.id),
      }))
      .sort((a, b) => (b.trendingScore?.score || 0) - (a.trendingScore?.score || 0));

    // Cache result
    this.cache.set(cacheKey, { rules: result, timestamp: Date.now() });

    return result;
  }

  /**
   * Get rising rules (new with high early engagement)
   */
  async getRisingRules(options: { limit?: number; maxAgeDays?: number } = {}): Promise<unknown[]> {
    const { limit = 10, maxAgeDays = 30 } = options;

    const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

    const rules = await prisma.rule.findMany({
      where: {
        visibility: 'PUBLIC',
        listedInMarketplace: true,
        archivedAt: null,
        publishedAt: {
          gte: cutoffDate,
        },
      },
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

    // Calculate velocity score (engagement per day)
    const scoredRules = rules.map((rule) => {
      const daysSincePublish = rule.publishedAt
        ? Math.max(1, Math.floor((Date.now() - rule.publishedAt.getTime()) / (24 * 60 * 60 * 1000)))
        : 1;

      const velocity = (rule.downloads + rule._count.adoptions * 2 + rule._count.reviews) / daysSincePublish;

      return {
        ...rule,
        velocity,
      };
    });

    scoredRules.sort((a, b) => b.velocity - a.velocity);

    return scoredRules.slice(0, limit);
  }

  /**
   * Get rules trending in a specific category
   */
  async getTrendingByCategory(limit = 5): Promise<Record<string, unknown[]>> {
    const categories = await prisma.rule.groupBy({
      by: ['category'],
      where: {
        visibility: 'PUBLIC',
        listedInMarketplace: true,
        archivedAt: null,
      },
      _count: true,
      having: {
        category: {
          _count: {
            gte: 3,
          },
        },
      },
    });

    const topCategories = categories
      .sort((a, b) => b._count - a._count)
      .slice(0, 10)
      .map((c) => c.category);

    const result: Record<string, unknown[]> = {};

    for (const category of topCategories) {
      result[category] = await this.getTrendingRules({ category, limit });
    }

    return result;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Trending cache cleared');
  }

  /**
   * Update trending scores (run as scheduled job)
   */
  async updateTrendingScores(): Promise<void> {
    logger.info('Updating trending scores...');

    const rules = await prisma.rule.findMany({
      where: {
        visibility: 'PUBLIC',
        listedInMarketplace: true,
        archivedAt: null,
      },
      include: {
        _count: {
          select: { adoptions: true, reviews: true },
        },
      },
    });

    const now = new Date();

    for (const rule of rules) {
      const daysSincePublish = rule.publishedAt
        ? Math.floor((now.getTime() - rule.publishedAt.getTime()) / (24 * 60 * 60 * 1000))
        : 365;

      const score = this.calculateScore({
        downloads: rule.downloads,
        views: 0, // Would need to fetch from analytics
        adoptions: rule._count.adoptions,
        reviews: rule._count.reviews,
        avgRating: rule.rating,
        daysSincePublish,
      });

      await prisma.rule.update({
        where: { id: rule.id },
        data: { trendingScore: score },
      });
    }

    this.clearCache();
    logger.info(`Updated trending scores for ${rules.length} rules`);
  }
}

// Singleton instance
export const trendingService = new TrendingService();

export default trendingService;
