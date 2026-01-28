/**
 * Search Index Service
 * 규칙 검색 인덱싱 및 검색 기능
 */

import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

interface SearchOptions {
  query: string;
  filters?: {
    category?: string;
    tags?: string[];
    minRating?: number;
    minDownloads?: number;
    author?: string;
    team?: string;
    publishedAfter?: Date;
    publishedBefore?: Date;
  };
  sort?: 'relevance' | 'downloads' | 'rating' | 'recent' | 'name';
  limit?: number;
  offset?: number;
}

interface SearchResult {
  rules: unknown[];
  total: number;
  facets: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    ratings: Array<{ rating: number; count: number }>;
  };
  suggestions?: string[];
}

interface IndexedRule {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  searchText: string;
  keywords: string[];
}

// ============================================================================
// Search Index Service
// ============================================================================

export class SearchIndexService {
  private index: Map<string, IndexedRule> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private lastIndexUpdate: Date | null = null;

  /**
   * Build or rebuild the search index
   */
  async buildIndex(): Promise<void> {
    logger.info('Building search index...');

    const rules = await prisma.rule.findMany({
      where: {
        visibility: 'PUBLIC',
        listedInMarketplace: true,
        archivedAt: null,
      },
      select: {
        id: true,
        ruleId: true,
        name: true,
        description: true,
        category: true,
        tags: true,
        content: true,
      },
    });

    this.index.clear();
    this.invertedIndex.clear();

    for (const rule of rules) {
      // Create search text from all text fields
      const searchText = [
        rule.name,
        rule.description || '',
        rule.ruleId,
        rule.category,
        ...rule.tags,
        rule.content || '',
      ]
        .join(' ')
        .toLowerCase();

      // Extract keywords
      const keywords = this.extractKeywords(searchText);

      const indexed: IndexedRule = {
        id: rule.id,
        ruleId: rule.ruleId,
        name: rule.name,
        description: rule.description || '',
        category: rule.category,
        tags: rule.tags,
        searchText,
        keywords,
      };

      this.index.set(rule.id, indexed);

      // Build inverted index
      for (const keyword of keywords) {
        if (!this.invertedIndex.has(keyword)) {
          this.invertedIndex.set(keyword, new Set());
        }
        this.invertedIndex.get(keyword)!.add(rule.id);
      }
    }

    this.lastIndexUpdate = new Date();
    logger.info(`Search index built with ${rules.length} rules and ${this.invertedIndex.size} unique terms`);
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Tokenize
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2);

    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
      'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
      'for', 'of', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'as',
    ]);

    return tokens.filter((t) => !stopWords.has(t));
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(rule: IndexedRule, queryTerms: string[]): number {
    let score = 0;

    for (const term of queryTerms) {
      // Exact match in name (highest weight)
      if (rule.name.toLowerCase().includes(term)) {
        score += 10;
      }

      // Exact match in ruleId
      if (rule.ruleId.toLowerCase().includes(term)) {
        score += 8;
      }

      // Exact match in description
      if (rule.description.toLowerCase().includes(term)) {
        score += 5;
      }

      // Match in tags
      if (rule.tags.some((tag) => tag.toLowerCase().includes(term))) {
        score += 6;
      }

      // Match in category
      if (rule.category.toLowerCase().includes(term)) {
        score += 4;
      }

      // Keyword match (lower weight for general content)
      if (rule.keywords.includes(term)) {
        score += 2;
      }
    }

    // Boost for exact phrase matches
    const queryPhrase = queryTerms.join(' ');
    if (rule.searchText.includes(queryPhrase)) {
      score *= 1.5;
    }

    return score;
  }

  /**
   * Search rules
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const { query, filters = {}, sort = 'relevance', limit = 20, offset = 0 } = options;

    // Ensure index is built
    if (this.index.size === 0) {
      await this.buildIndex();
    }

    const queryTerms = this.extractKeywords(query);

    // Find candidate rules using inverted index
    const candidateIds = new Set<string>();
    for (const term of queryTerms) {
      // Exact match
      if (this.invertedIndex.has(term)) {
        this.invertedIndex.get(term)!.forEach((id) => candidateIds.add(id));
      }
      // Prefix match
      for (const [indexTerm, ruleIds] of this.invertedIndex) {
        if (indexTerm.startsWith(term) || term.startsWith(indexTerm)) {
          ruleIds.forEach((id) => candidateIds.add(id));
        }
      }
    }

    // Get full rule data for candidates
    const where: Record<string, unknown> = {
      id: { in: Array.from(candidateIds) },
      visibility: 'PUBLIC',
      listedInMarketplace: true,
      archivedAt: null,
    };

    // Apply filters
    if (filters.category) {
      where.category = { startsWith: filters.category };
    }
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasEvery: filters.tags };
    }
    if (filters.minRating) {
      where.rating = { gte: filters.minRating };
    }
    if (filters.minDownloads) {
      where.downloads = { gte: filters.minDownloads };
    }
    if (filters.author) {
      where.author = { username: filters.author };
    }
    if (filters.team) {
      where.team = { slug: filters.team };
    }
    if (filters.publishedAfter) {
      where.publishedAt = { ...where.publishedAt as object, gte: filters.publishedAfter };
    }
    if (filters.publishedBefore) {
      where.publishedAt = { ...where.publishedAt as object, lte: filters.publishedBefore };
    }

    const [rules, total] = await Promise.all([
      prisma.rule.findMany({
        where,
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          team: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.rule.count({ where }),
    ]);

    // Calculate relevance scores
    const scoredRules = rules.map((rule) => {
      const indexed = this.index.get(rule.id);
      const relevance = indexed ? this.calculateRelevance(indexed, queryTerms) : 0;
      return { ...rule, relevance };
    });

    // Sort
    switch (sort) {
      case 'relevance':
        scoredRules.sort((a, b) => b.relevance - a.relevance);
        break;
      case 'downloads':
        scoredRules.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        scoredRules.sort((a, b) => b.rating - a.rating);
        break;
      case 'recent':
        scoredRules.sort((a, b) => {
          const aDate = a.publishedAt?.getTime() || 0;
          const bDate = b.publishedAt?.getTime() || 0;
          return bDate - aDate;
        });
        break;
      case 'name':
        scoredRules.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    // Paginate
    const paginatedRules = scoredRules.slice(offset, offset + limit);

    // Get facets
    const facets = await this.getFacets(where);

    // Generate suggestions if no results
    const suggestions = scoredRules.length === 0 ? await this.getSuggestions(query) : undefined;

    return {
      rules: paginatedRules,
      total,
      facets,
      suggestions,
    };
  }

  /**
   * Get search facets
   */
  private async getFacets(baseWhere: Record<string, unknown>): Promise<SearchResult['facets']> {
    const [categoryGroups, tagCounts, ratingGroups] = await Promise.all([
      // Categories
      prisma.rule.groupBy({
        by: ['category'],
        where: baseWhere,
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 10,
      }),
      // Tags (need to aggregate differently)
      prisma.rule.findMany({
        where: baseWhere,
        select: { tags: true },
      }),
      // Ratings
      prisma.rule.groupBy({
        by: ['rating'],
        where: { ...baseWhere, rating: { gt: 0 } },
        _count: true,
      }),
    ]);

    // Aggregate tags
    const tagMap = new Map<string, number>();
    for (const rule of tagCounts) {
      for (const tag of rule.tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }
    const tags = Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Round ratings
    const ratingMap = new Map<number, number>();
    for (const group of ratingGroups) {
      const rounded = Math.floor(group.rating);
      ratingMap.set(rounded, (ratingMap.get(rounded) || 0) + group._count);
    }
    const ratings = Array.from(ratingMap.entries())
      .map(([rating, count]) => ({ rating, count }))
      .sort((a, b) => b.rating - a.rating);

    return {
      categories: categoryGroups.map((c) => ({ name: c.category, count: c._count })),
      tags,
      ratings,
    };
  }

  /**
   * Get search suggestions
   */
  private async getSuggestions(query: string): Promise<string[]> {
    const queryLower = query.toLowerCase();
    const suggestions: string[] = [];

    // Find similar terms in the index
    for (const term of this.invertedIndex.keys()) {
      if (term.includes(queryLower) || queryLower.includes(term)) {
        suggestions.push(term);
        if (suggestions.length >= 5) break;
      }
    }

    // Get popular categories and tags
    const [popularCategories, popularTags] = await Promise.all([
      prisma.rule.groupBy({
        by: ['category'],
        where: { visibility: 'PUBLIC', listedInMarketplace: true },
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 3,
      }),
      prisma.rule.findMany({
        where: { visibility: 'PUBLIC', listedInMarketplace: true },
        select: { tags: true },
        take: 100,
      }),
    ]);

    suggestions.push(...popularCategories.map((c) => c.category));

    const tagCounts = new Map<string, number>();
    for (const rule of popularTags) {
      for (const tag of rule.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);

    suggestions.push(...topTags);

    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Autocomplete
   */
  async autocomplete(prefix: string, limit = 10): Promise<string[]> {
    if (prefix.length < 2) {
      return [];
    }

    const prefixLower = prefix.toLowerCase();
    const suggestions = new Set<string>();

    // Search rule names
    const rules = await prisma.rule.findMany({
      where: {
        visibility: 'PUBLIC',
        listedInMarketplace: true,
        OR: [
          { name: { contains: prefix, mode: 'insensitive' } },
          { ruleId: { contains: prefix, mode: 'insensitive' } },
        ],
      },
      select: { name: true, ruleId: true },
      take: limit,
    });

    for (const rule of rules) {
      suggestions.add(rule.name);
      if (rule.ruleId.toLowerCase().includes(prefixLower)) {
        suggestions.add(rule.ruleId);
      }
    }

    // Add matching tags
    const tagsResult = await prisma.rule.findMany({
      where: {
        visibility: 'PUBLIC',
        listedInMarketplace: true,
      },
      select: { tags: true },
      take: 100,
    });

    const allTags = new Set(tagsResult.flatMap((r) => r.tags));
    for (const tag of allTags) {
      if (tag.toLowerCase().includes(prefixLower)) {
        suggestions.add(tag);
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get index stats
   */
  getStats(): { ruleCount: number; termCount: number; lastUpdate: Date | null } {
    return {
      ruleCount: this.index.size,
      termCount: this.invertedIndex.size,
      lastUpdate: this.lastIndexUpdate,
    };
  }

  /**
   * Clear the index
   */
  clearIndex(): void {
    this.index.clear();
    this.invertedIndex.clear();
    this.lastIndexUpdate = null;
    logger.info('Search index cleared');
  }
}

// Singleton instance
export const searchIndexService = new SearchIndexService();

export default searchIndexService;
