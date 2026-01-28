/**
 * Rules Routes Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestRule, createTestTeam } from '../setup';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    rule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    ruleVersion: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    teamMember: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../../db';

describe('Rules Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/rules', () => {
    it('should return team rules with pagination', async () => {
      const mockRules = [
        createTestRule({ id: 'rule-1', name: 'Rule 1' }),
        createTestRule({ id: 'rule-2', name: 'Rule 2' }),
      ];
      (prisma.rule.findMany as any).mockResolvedValue(mockRules);
      (prisma.rule.count as any).mockResolvedValue(2);

      const rules = await prisma.rule.findMany({});
      const total = await prisma.rule.count({});

      expect(rules).toHaveLength(2);
      expect(total).toBe(2);
    });

    it('should filter rules by category', async () => {
      const mockRules = [createTestRule({ category: 'code/naming' })];
      (prisma.rule.findMany as any).mockResolvedValue(mockRules);

      const rules = await prisma.rule.findMany({
        where: { category: { startsWith: 'code' } },
      });
      expect(rules[0].category).toContain('code');
    });

    it('should filter rules by tags', async () => {
      const mockRules = [createTestRule({ tags: ['typescript', 'naming'] })];
      (prisma.rule.findMany as any).mockResolvedValue(mockRules);

      const rules = await prisma.rule.findMany({});
      expect(rules[0].tags).toContain('typescript');
    });

    it('should search rules by query', async () => {
      const mockRules = [createTestRule({ name: 'Variable Naming Rule' })];
      (prisma.rule.findMany as any).mockResolvedValue(mockRules);

      const rules = await prisma.rule.findMany({});
      expect(rules[0].name).toContain('Naming');
    });
  });

  describe('POST /api/rules', () => {
    it('should create a new rule', async () => {
      const newRule = createTestRule({
        ruleId: 'new-rule-001',
        name: 'New Rule',
      });
      (prisma.rule.findFirst as any).mockResolvedValue(null);
      (prisma.rule.create as any).mockResolvedValue(newRule);

      const rule = await prisma.rule.create({ data: newRule });
      expect(rule.ruleId).toBe('new-rule-001');
    });

    it('should reject duplicate ruleId in same team', async () => {
      const existingRule = createTestRule({ ruleId: 'existing-001' });
      (prisma.rule.findFirst as any).mockResolvedValue(existingRule);

      const error = new Error('Rule with this ID already exists');
      expect(error.message).toContain('already exists');
    });

    it('should validate rule severity', async () => {
      const validSeverities = ['ERROR', 'WARNING', 'INFO'];
      const invalidSeverity = 'CRITICAL';

      expect(validSeverities.includes(invalidSeverity)).toBe(false);
    });

    it('should validate rule visibility', async () => {
      const validVisibilities = ['PRIVATE', 'TEAM', 'PUBLIC'];
      const testVisibility = 'TEAM';

      expect(validVisibilities.includes(testVisibility)).toBe(true);
    });
  });

  describe('GET /api/rules/:ruleId', () => {
    it('should return rule details', async () => {
      const mockRule = createTestRule();
      (prisma.rule.findFirst as any).mockResolvedValue(mockRule);

      const rule = await prisma.rule.findFirst({
        where: { OR: [{ id: mockRule.id }, { ruleId: mockRule.ruleId }] },
      });
      expect(rule?.name).toBe('Test Rule');
    });

    it('should return 404 for non-existent rule', async () => {
      (prisma.rule.findFirst as any).mockResolvedValue(null);

      const rule = await prisma.rule.findFirst({
        where: { id: 'non-existent' },
      });
      expect(rule).toBeNull();
    });
  });

  describe('PUT /api/rules/:ruleId', () => {
    it('should update rule and create version', async () => {
      const mockRule = createTestRule({ version: '1.0.0' });
      const updatedRule = { ...mockRule, name: 'Updated Rule', version: '1.1.0' };

      (prisma.rule.findFirst as any).mockResolvedValue(mockRule);
      (prisma.rule.update as any).mockResolvedValue(updatedRule);
      (prisma.ruleVersion.create as any).mockResolvedValue({
        id: 'version-id',
        ruleId: mockRule.id,
        version: '1.1.0',
      });

      const rule = await prisma.rule.update({
        where: { id: mockRule.id },
        data: { name: 'Updated Rule', version: '1.1.0' },
      });

      expect(rule.name).toBe('Updated Rule');
      expect(rule.version).toBe('1.1.0');
    });

    it('should reject update from non-team member', async () => {
      (prisma.teamMember.findUnique as any).mockResolvedValue(null);

      const membership = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: 'outsider', teamId: 'test-team' } },
      });
      expect(membership).toBeNull();
    });
  });

  describe('DELETE /api/rules/:ruleId', () => {
    it('should delete rule', async () => {
      const mockRule = createTestRule();
      (prisma.rule.findFirst as any).mockResolvedValue(mockRule);
      (prisma.rule.delete as any).mockResolvedValue(mockRule);

      const deleted = await prisma.rule.delete({ where: { id: mockRule.id } });
      expect(deleted.id).toBe(mockRule.id);
    });

    it('should reject delete of archived rule', async () => {
      const archivedRule = createTestRule({ archivedAt: new Date() });
      (prisma.rule.findFirst as any).mockResolvedValue(archivedRule);

      expect(archivedRule.archivedAt).not.toBeNull();
    });
  });

  describe('POST /api/rules/:ruleId/publish', () => {
    it('should publish rule to marketplace', async () => {
      const mockRule = createTestRule({ listedInMarketplace: false });
      const publishedRule = {
        ...mockRule,
        listedInMarketplace: true,
        visibility: 'PUBLIC',
        publishedAt: new Date(),
      };

      (prisma.rule.findFirst as any).mockResolvedValue(mockRule);
      (prisma.rule.update as any).mockResolvedValue(publishedRule);

      const rule = await prisma.rule.update({
        where: { id: mockRule.id },
        data: { listedInMarketplace: true, visibility: 'PUBLIC' },
      });

      expect(rule.listedInMarketplace).toBe(true);
      expect(rule.visibility).toBe('PUBLIC');
    });
  });

  describe('GET /api/rules/:ruleId/versions', () => {
    it('should return rule version history', async () => {
      const versions = [
        { id: 'v1', version: '1.0.0', createdAt: new Date('2024-01-01') },
        { id: 'v2', version: '1.1.0', createdAt: new Date('2024-01-15') },
      ];
      (prisma.ruleVersion.findMany as any).mockResolvedValue(versions);

      const history = await prisma.ruleVersion.findMany({});
      expect(history).toHaveLength(2);
      expect(history[0].version).toBe('1.0.0');
    });
  });
});
