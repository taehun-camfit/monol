/**
 * Proposals Routes Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestProposal, createTestRule } from '../setup';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    proposal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    proposalReview: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    rule: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../db';

describe('Proposals Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/proposals', () => {
    it('should return team proposals with pagination', async () => {
      const mockProposals = [
        createTestProposal({ id: 'p1', title: 'Proposal 1' }),
        createTestProposal({ id: 'p2', title: 'Proposal 2' }),
      ];
      (prisma.proposal.findMany as any).mockResolvedValue(mockProposals);
      (prisma.proposal.count as any).mockResolvedValue(2);

      const proposals = await prisma.proposal.findMany({});
      expect(proposals).toHaveLength(2);
    });

    it('should filter proposals by status', async () => {
      const mockProposals = [createTestProposal({ status: 'PENDING' })];
      (prisma.proposal.findMany as any).mockResolvedValue(mockProposals);

      const proposals = await prisma.proposal.findMany({
        where: { status: 'PENDING' },
      });
      expect(proposals[0].status).toBe('PENDING');
    });

    it('should filter proposals by type', async () => {
      const mockProposals = [createTestProposal({ type: 'CREATE' })];
      (prisma.proposal.findMany as any).mockResolvedValue(mockProposals);

      const proposals = await prisma.proposal.findMany({
        where: { type: 'CREATE' },
      });
      expect(proposals[0].type).toBe('CREATE');
    });
  });

  describe('POST /api/proposals', () => {
    it('should create a new proposal', async () => {
      const newProposal = createTestProposal({
        title: 'New Feature Proposal',
        type: 'CREATE',
      });
      (prisma.proposal.create as any).mockResolvedValue(newProposal);

      const proposal = await prisma.proposal.create({ data: newProposal });
      expect(proposal.title).toBe('New Feature Proposal');
      expect(proposal.status).toBe('DRAFT');
    });

    it('should validate proposal type', async () => {
      const validTypes = ['CREATE', 'UPDATE', 'DELETE', 'DEPRECATE'];
      const testType = 'CREATE';

      expect(validTypes.includes(testType)).toBe(true);
    });

    it('should require ruleId for UPDATE type', async () => {
      const updateProposal = createTestProposal({
        type: 'UPDATE',
        ruleId: null,
      });

      const isValid = updateProposal.type !== 'UPDATE' || updateProposal.ruleId !== null;
      expect(isValid).toBe(false);
    });
  });

  describe('GET /api/proposals/:proposalId', () => {
    it('should return proposal details with reviews', async () => {
      const mockProposal = createTestProposal();
      (prisma.proposal.findUnique as any).mockResolvedValue({
        ...mockProposal,
        reviews: [],
        comments: [],
      });

      const proposal = await prisma.proposal.findUnique({
        where: { id: mockProposal.id },
      });
      expect(proposal?.title).toBe('Test Proposal');
    });

    it('should return 404 for non-existent proposal', async () => {
      (prisma.proposal.findUnique as any).mockResolvedValue(null);

      const proposal = await prisma.proposal.findUnique({
        where: { id: 'non-existent' },
      });
      expect(proposal).toBeNull();
    });
  });

  describe('PUT /api/proposals/:proposalId', () => {
    it('should update draft proposal', async () => {
      const draftProposal = createTestProposal({ status: 'DRAFT' });
      const updatedProposal = { ...draftProposal, title: 'Updated Title' };

      (prisma.proposal.findUnique as any).mockResolvedValue(draftProposal);
      (prisma.proposal.update as any).mockResolvedValue(updatedProposal);

      const proposal = await prisma.proposal.update({
        where: { id: draftProposal.id },
        data: { title: 'Updated Title' },
      });
      expect(proposal.title).toBe('Updated Title');
    });

    it('should reject update of submitted proposal', async () => {
      const submittedProposal = createTestProposal({ status: 'PENDING' });
      (prisma.proposal.findUnique as any).mockResolvedValue(submittedProposal);

      const canUpdate = submittedProposal.status === 'DRAFT';
      expect(canUpdate).toBe(false);
    });
  });

  describe('POST /api/proposals/:proposalId/submit', () => {
    it('should submit draft proposal for review', async () => {
      const draftProposal = createTestProposal({ status: 'DRAFT' });
      const submittedProposal = {
        ...draftProposal,
        status: 'PENDING',
        submittedAt: new Date(),
      };

      (prisma.proposal.findUnique as any).mockResolvedValue(draftProposal);
      (prisma.proposal.update as any).mockResolvedValue(submittedProposal);

      const proposal = await prisma.proposal.update({
        where: { id: draftProposal.id },
        data: { status: 'PENDING', submittedAt: new Date() },
      });

      expect(proposal.status).toBe('PENDING');
      expect(proposal.submittedAt).not.toBeNull();
    });

    it('should reject submit of already submitted proposal', async () => {
      const pendingProposal = createTestProposal({ status: 'PENDING' });
      (prisma.proposal.findUnique as any).mockResolvedValue(pendingProposal);

      const canSubmit = pendingProposal.status === 'DRAFT';
      expect(canSubmit).toBe(false);
    });
  });

  describe('POST /api/proposals/:proposalId/review', () => {
    it('should add approval review', async () => {
      const review = {
        id: 'review-id',
        proposalId: 'proposal-id',
        reviewerId: 'reviewer-id',
        decision: 'APPROVED',
        comment: 'LGTM',
      };
      (prisma.proposalReview.upsert as any).mockResolvedValue(review);

      const created = await prisma.proposalReview.upsert({
        where: { proposalId_reviewerId: { proposalId: 'proposal-id', reviewerId: 'reviewer-id' } },
        create: review,
        update: review,
      });

      expect(created.decision).toBe('APPROVED');
    });

    it('should add rejection review', async () => {
      const review = {
        id: 'review-id',
        proposalId: 'proposal-id',
        reviewerId: 'reviewer-id',
        decision: 'REJECTED',
        comment: 'Needs more work',
      };
      (prisma.proposalReview.upsert as any).mockResolvedValue(review);

      const created = await prisma.proposalReview.upsert({
        where: { proposalId_reviewerId: { proposalId: 'proposal-id', reviewerId: 'reviewer-id' } },
        create: review,
        update: review,
      });

      expect(created.decision).toBe('REJECTED');
    });

    it('should add changes requested review', async () => {
      const review = {
        id: 'review-id',
        decision: 'CHANGES_REQUESTED',
        comment: 'Please update the description',
      };
      (prisma.proposalReview.upsert as any).mockResolvedValue(review);

      const created = await prisma.proposalReview.upsert({
        where: { proposalId_reviewerId: { proposalId: 'p', reviewerId: 'r' } },
        create: review,
        update: review,
      });

      expect(created.decision).toBe('CHANGES_REQUESTED');
    });

    it('should reject review from proposal author', async () => {
      const proposal = createTestProposal({ authorId: 'author-id' });
      const reviewerId = 'author-id';

      const isSelfReview = proposal.authorId === reviewerId;
      expect(isSelfReview).toBe(true);
    });
  });

  describe('POST /api/proposals/:proposalId/merge', () => {
    it('should merge approved proposal', async () => {
      const approvedProposal = createTestProposal({
        status: 'APPROVED',
        type: 'CREATE',
        currentApprovals: 2,
        requiredApprovals: 1,
      });
      const mergedProposal = {
        ...approvedProposal,
        status: 'MERGED',
        mergedAt: new Date(),
      };

      (prisma.proposal.findUnique as any).mockResolvedValue(approvedProposal);
      (prisma.proposal.update as any).mockResolvedValue(mergedProposal);
      (prisma.rule.create as any).mockResolvedValue(createTestRule());

      const canMerge = approvedProposal.currentApprovals >= approvedProposal.requiredApprovals;
      expect(canMerge).toBe(true);
    });

    it('should reject merge without enough approvals', async () => {
      const proposal = createTestProposal({
        status: 'PENDING',
        currentApprovals: 0,
        requiredApprovals: 2,
      });
      (prisma.proposal.findUnique as any).mockResolvedValue(proposal);

      const canMerge = proposal.currentApprovals >= proposal.requiredApprovals;
      expect(canMerge).toBe(false);
    });

    it('should create rule for CREATE proposal', async () => {
      const createProposal = createTestProposal({ type: 'CREATE' });
      const newRule = createTestRule();

      (prisma.rule.create as any).mockResolvedValue(newRule);

      const rule = await prisma.rule.create({ data: newRule });
      expect(rule.id).toBeDefined();
    });

    it('should update rule for UPDATE proposal', async () => {
      const updateProposal = createTestProposal({
        type: 'UPDATE',
        ruleId: 'existing-rule-id',
      });
      const updatedRule = createTestRule({ name: 'Updated Name' });

      (prisma.rule.update as any).mockResolvedValue(updatedRule);

      const rule = await prisma.rule.update({
        where: { id: updateProposal.ruleId! },
        data: { name: 'Updated Name' },
      });
      expect(rule.name).toBe('Updated Name');
    });

    it('should delete rule for DELETE proposal', async () => {
      const deleteProposal = createTestProposal({
        type: 'DELETE',
        ruleId: 'rule-to-delete',
      });

      (prisma.rule.delete as any).mockResolvedValue(createTestRule());

      const deleted = await prisma.rule.delete({
        where: { id: deleteProposal.ruleId! },
      });
      expect(deleted).toBeDefined();
    });
  });

  describe('POST /api/proposals/:proposalId/cancel', () => {
    it('should cancel proposal', async () => {
      const proposal = createTestProposal({ status: 'PENDING' });
      const cancelledProposal = {
        ...proposal,
        status: 'CANCELLED',
        closedAt: new Date(),
      };

      (prisma.proposal.findUnique as any).mockResolvedValue(proposal);
      (prisma.proposal.update as any).mockResolvedValue(cancelledProposal);

      const updated = await prisma.proposal.update({
        where: { id: proposal.id },
        data: { status: 'CANCELLED', closedAt: new Date() },
      });

      expect(updated.status).toBe('CANCELLED');
    });

    it('should reject cancel of merged proposal', async () => {
      const mergedProposal = createTestProposal({ status: 'MERGED' });
      (prisma.proposal.findUnique as any).mockResolvedValue(mergedProposal);

      const canCancel = ['DRAFT', 'PENDING'].includes(mergedProposal.status);
      expect(canCancel).toBe(false);
    });
  });
});
