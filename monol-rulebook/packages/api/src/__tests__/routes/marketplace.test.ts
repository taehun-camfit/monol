/**
 * Marketplace Routes Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestRule } from '../setup';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    rule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    ruleAdoption: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    ruleReview: {
      findMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    collection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    favorite: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    teamMember: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../../db';

describe('Marketplace Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/marketplace/rules', () => {
    it('should return public marketplace rules', async () => {
      const mockRules = [
        createTestRule({
          visibility: 'PUBLIC',
          listedInMarketplace: true,
          downloads: 100,
        }),
      ];
      (prisma.rule.findMany as any).mockResolvedValue(mockRules);
      (prisma.rule.count as any).mockResolvedValue(1);

      const rules = await prisma.rule.findMany({
        where: {
          visibility: 'PUBLIC',
          listedInMarketplace: true,
        },
      });

      expect(rules).toHaveLength(1);
      expect(rules[0].visibility).toBe('PUBLIC');
    });

    it('should filter by category', async () => {
      const mockRules = [
        createTestRule({ category: 'code/naming', listedInMarketplace: true }),
      ];
      (prisma.rule.findMany as any).mockResolvedValue(mockRules);

      const rules = await prisma.rule.findMany({
        where: { category: { startsWith: 'code' } },
      });

      expect(rules[0].category).toContain('code');
    });

    it('should filter by tags', async () => {
      const mockRules = [
        createTestRule({ tags: ['typescript', 'naming'], listedInMarketplace: true }),
      ];
      (prisma.rule.findMany as any).mockResolvedValue(mockRules);

      const rules = await prisma.rule.findMany({
        where: { tags: { hasEvery: ['typescript'] } },
      });

      expect(rules[0].tags).toContain('typescript');
    });

    it('should sort by downloads', async () => {
      const mockRules = [
        createTestRule({ downloads: 500 }),
        createTestRule({ downloads: 100 }),
      ];
      (prisma.rule.findMany as any).mockResolvedValue(mockRules);

      const rules = await prisma.rule.findMany({
        orderBy: { downloads: 'desc' },
      });

      expect(rules[0].downloads).toBeGreaterThanOrEqual(rules[1].downloads);
    });

    it('should sort by rating', async () => {
      const mockRules = [
        createTestRule({ rating: 4.5 }),
        createTestRule({ rating: 3.2 }),
      ];
      (prisma.rule.findMany as any).mockResolvedValue(mockRules);

      const rules = await prisma.rule.findMany({
        orderBy: { rating: 'desc' },
      });

      expect(rules[0].rating).toBeGreaterThanOrEqual(rules[1].rating);
    });
  });

  describe('GET /api/marketplace/rules/:ruleId', () => {
    it('should return marketplace rule details', async () => {
      const mockRule = createTestRule({
        visibility: 'PUBLIC',
        listedInMarketplace: true,
      });
      (prisma.rule.findFirst as any).mockResolvedValue(mockRule);

      const rule = await prisma.rule.findFirst({
        where: {
          id: mockRule.id,
          visibility: 'PUBLIC',
          listedInMarketplace: true,
        },
      });

      expect(rule?.name).toBe('Test Rule');
    });

    it('should not return private rules', async () => {
      (prisma.rule.findFirst as any).mockResolvedValue(null);

      const rule = await prisma.rule.findFirst({
        where: {
          visibility: 'PUBLIC',
          listedInMarketplace: true,
          id: 'private-rule',
        },
      });

      expect(rule).toBeNull();
    });
  });

  describe('POST /api/marketplace/rules/:ruleId/adopt', () => {
    it('should adopt a marketplace rule', async () => {
      const mockRule = createTestRule({
        visibility: 'PUBLIC',
        listedInMarketplace: true,
      });
      const adoption = {
        id: 'adoption-id',
        ruleId: mockRule.id,
        adopterTeamId: 'team-id',
      };

      (prisma.rule.findFirst as any).mockResolvedValue(mockRule);
      (prisma.ruleAdoption.findUnique as any).mockResolvedValue(null);
      (prisma.ruleAdoption.create as any).mockResolvedValue(adoption);
      (prisma.teamMember.findUnique as any).mockResolvedValue({ role: 'MEMBER' });

      const created = await prisma.ruleAdoption.create({ data: adoption });
      expect(created.ruleId).toBe(mockRule.id);
    });

    it('should reject duplicate adoption', async () => {
      const existingAdoption = {
        id: 'existing-adoption',
        ruleId: 'rule-id',
        adopterTeamId: 'team-id',
      };
      (prisma.ruleAdoption.findUnique as any).mockResolvedValue(existingAdoption);

      const adoption = await prisma.ruleAdoption.findUnique({
        where: { ruleId_adopterTeamId: { ruleId: 'rule-id', adopterTeamId: 'team-id' } },
      });

      expect(adoption).not.toBeNull();
    });

    it('should increment download count', async () => {
      const mockRule = createTestRule({ downloads: 100 });
      (prisma.rule.update as any).mockResolvedValue({ ...mockRule, downloads: 101 });

      const updated = await prisma.rule.update({
        where: { id: mockRule.id },
        data: { downloads: { increment: 1 } },
      });

      expect(updated.downloads).toBe(101);
    });
  });

  describe('GET /api/marketplace/trending', () => {
    it('should return trending rules', async () => {
      const trendingRules = [
        createTestRule({ downloads: 1000, rating: 4.8 }),
        createTestRule({ downloads: 500, rating: 4.5 }),
      ];
      (prisma.rule.findMany as any).mockResolvedValue(trendingRules);

      const rules = await prisma.rule.findMany({
        where: { visibility: 'PUBLIC', listedInMarketplace: true },
        orderBy: [{ downloads: 'desc' }, { rating: 'desc' }],
        take: 10,
      });

      expect(rules).toHaveLength(2);
      expect(rules[0].downloads).toBe(1000);
    });
  });

  describe('GET /api/marketplace/categories', () => {
    it('should return categories with counts', async () => {
      const categories = [
        { category: 'code/naming', _count: 15 },
        { category: 'code/style', _count: 10 },
      ];
      (prisma.rule.groupBy as any).mockResolvedValue(categories);

      const result = await prisma.rule.groupBy({
        by: ['category'],
        _count: true,
      });

      expect(result).toHaveLength(2);
      expect(result[0]._count).toBe(15);
    });
  });

  describe('GET /api/marketplace/collections', () => {
    it('should return featured collections', async () => {
      const collections = [
        { id: 'col-1', name: 'Best Practices', featured: true },
        { id: 'col-2', name: 'Security Rules', featured: true },
      ];
      (prisma.collection.findMany as any).mockResolvedValue(collections);

      const result = await prisma.collection.findMany({
        where: { featured: true },
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('Reviews API', () => {
    it('should return reviews for a rule', async () => {
      const reviews = [
        { id: 'r1', rating: 5, content: 'Great rule!' },
        { id: 'r2', rating: 4, content: 'Good but could be better' },
      ];
      (prisma.ruleReview.findMany as any).mockResolvedValue(reviews);

      const result = await prisma.ruleReview.findMany({
        where: { ruleId: 'rule-id' },
      });

      expect(result).toHaveLength(2);
    });

    it('should calculate average rating', async () => {
      (prisma.ruleReview.aggregate as any).mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: 10,
      });

      const stats = await prisma.ruleReview.aggregate({
        where: { ruleId: 'rule-id' },
        _avg: { rating: true },
        _count: true,
      });

      expect(stats._avg.rating).toBe(4.5);
      expect(stats._count).toBe(10);
    });

    it('should create a review', async () => {
      const review = {
        id: 'review-id',
        ruleId: 'rule-id',
        authorId: 'user-id',
        rating: 5,
        content: 'Excellent rule!',
      };
      (prisma.ruleReview.create as any).mockResolvedValue(review);

      const created = await prisma.ruleReview.create({ data: review });
      expect(created.rating).toBe(5);
    });
  });

  describe('Favorites API', () => {
    it('should add rule to favorites', async () => {
      const favorite = {
        id: 'fav-id',
        userId: 'user-id',
        type: 'RULE',
        targetId: 'rule-id',
      };
      (prisma.favorite.findUnique as any).mockResolvedValue(null);
      (prisma.favorite.create as any).mockResolvedValue(favorite);

      const created = await prisma.favorite.create({ data: favorite });
      expect(created.type).toBe('RULE');
    });

    it('should remove rule from favorites', async () => {
      const favorite = { id: 'fav-id' };
      (prisma.favorite.delete as any).mockResolvedValue(favorite);

      const deleted = await prisma.favorite.delete({ where: { id: 'fav-id' } });
      expect(deleted.id).toBe('fav-id');
    });

    it('should check favorite status', async () => {
      const favorite = { id: 'fav-id', userId: 'user-id', type: 'RULE', targetId: 'rule-id' };
      (prisma.favorite.findUnique as any).mockResolvedValue(favorite);

      const found = await prisma.favorite.findUnique({
        where: { userId_type_targetId: { userId: 'user-id', type: 'RULE', targetId: 'rule-id' } },
      });

      expect(found).not.toBeNull();
    });
  });
});
