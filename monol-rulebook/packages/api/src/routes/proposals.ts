/**
 * Proposals Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import {
  requireAuth,
  requireTeamMember,
  requireTeamAdmin,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { NotFoundError, BadRequestError, ConflictError } from '../middleware/error.js';

export const proposalsRouter = Router();

// ============================================================================
// Schemas
// ============================================================================

const createProposalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string(),
  type: z.enum(['CREATE', 'UPDATE', 'DELETE', 'DEPRECATE']),
  ruleId: z.string().optional(),
  changes: z.record(z.any()),
});

const reviewProposalSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  comment: z.string().optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/teams/:teamId/proposals - List proposals
 */
proposalsRouter.get('/teams/:teamId/proposals', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, type, limit = '20', offset = '0' } = req.query;
    const teamId = req.params.teamId;

    const where: Record<string, unknown> = { teamId };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          rule: {
            select: { id: true, ruleId: true, name: true },
          },
          _count: {
            select: { reviews: true, comments: true },
          },
        },
      }),
      prisma.proposal.count({ where }),
    ]);

    res.json({
      proposals,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams/:teamId/proposals - Create proposal
 */
proposalsRouter.post('/teams/:teamId/proposals', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;
    const data = createProposalSchema.parse(req.body);

    // Get team settings for required approvals
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError('Team');
    }

    const settings = team.settings as { minApprovers?: number } || {};
    const requiredApprovals = settings.minApprovers || 1;

    const proposal = await prisma.proposal.create({
      data: {
        ...data,
        teamId,
        authorId: req.user!.id,
        requiredApprovals,
        status: 'DRAFT',
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    res.status(201).json(proposal);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:teamId/proposals/:proposalId - Get proposal
 */
proposalsRouter.get('/teams/:teamId/proposals/:proposalId', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, proposalId } = req.params;

    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, teamId },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        rule: true,
        reviews: {
          include: {
            reviewer: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            author: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundError('Proposal');
    }

    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams/:teamId/proposals/:proposalId/submit - Submit for review
 */
proposalsRouter.post('/teams/:teamId/proposals/:proposalId/submit', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, proposalId } = req.params;

    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, teamId },
    });

    if (!proposal) {
      throw new NotFoundError('Proposal');
    }

    if (proposal.status !== 'DRAFT') {
      throw new BadRequestError('Proposal is not in draft status');
    }

    if (proposal.authorId !== req.user!.id) {
      throw new BadRequestError('Only the author can submit');
    }

    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: 'PENDING',
        submittedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams/:teamId/proposals/:proposalId/review - Review proposal
 */
proposalsRouter.post('/teams/:teamId/proposals/:proposalId/review', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, proposalId } = req.params;
    const data = reviewProposalSchema.parse(req.body);

    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, teamId },
    });

    if (!proposal) {
      throw new NotFoundError('Proposal');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestError('Proposal is not pending review');
    }

    // Can't review own proposal
    if (proposal.authorId === req.user!.id) {
      throw new BadRequestError('Cannot review your own proposal');
    }

    // Check if already reviewed
    const existingReview = await prisma.proposalReview.findUnique({
      where: {
        proposalId_reviewerId: {
          proposalId,
          reviewerId: req.user!.id,
        },
      },
    });

    if (existingReview) {
      // Update existing review
      await prisma.proposalReview.update({
        where: { id: existingReview.id },
        data: {
          decision: data.decision,
          comment: data.comment,
        },
      });
    } else {
      // Create new review
      await prisma.proposalReview.create({
        data: {
          proposalId,
          reviewerId: req.user!.id,
          decision: data.decision,
          comment: data.comment,
        },
      });
    }

    // Count approvals
    const approvals = await prisma.proposalReview.count({
      where: {
        proposalId,
        decision: 'APPROVED',
      },
    });

    // Update approval count and status
    let newStatus = proposal.status;
    if (approvals >= proposal.requiredApprovals) {
      newStatus = 'APPROVED';
    } else if (data.decision === 'REJECTED') {
      // Any rejection blocks the proposal
      newStatus = 'REJECTED';
    }

    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        currentApprovals: approvals,
        status: newStatus,
      },
      include: {
        reviews: {
          include: {
            reviewer: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams/:teamId/proposals/:proposalId/merge - Merge proposal
 */
proposalsRouter.post('/teams/:teamId/proposals/:proposalId/merge', requireAuth, requireTeamAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, proposalId } = req.params;

    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, teamId },
    });

    if (!proposal) {
      throw new NotFoundError('Proposal');
    }

    if (proposal.status !== 'APPROVED') {
      throw new BadRequestError('Proposal must be approved before merging');
    }

    // Apply changes based on proposal type
    const changes = proposal.changes as Record<string, unknown>;

    switch (proposal.type) {
      case 'CREATE':
        await prisma.rule.create({
          data: {
            teamId,
            authorId: proposal.authorId,
            ...changes,
          } as never,
        });
        break;

      case 'UPDATE':
        if (proposal.ruleId) {
          await prisma.rule.update({
            where: { id: proposal.ruleId },
            data: changes as never,
          });
        }
        break;

      case 'DELETE':
        if (proposal.ruleId) {
          await prisma.rule.delete({
            where: { id: proposal.ruleId },
          });
        }
        break;

      case 'DEPRECATE':
        if (proposal.ruleId) {
          await prisma.rule.update({
            where: { id: proposal.ruleId },
            data: {
              archivedAt: new Date(),
              metadata: {
                deprecated: true,
                deprecatedAt: new Date().toISOString(),
              },
            },
          });
        }
        break;
    }

    // Update proposal status
    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: 'MERGED',
        mergedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams/:teamId/proposals/:proposalId/cancel - Cancel proposal
 */
proposalsRouter.post('/teams/:teamId/proposals/:proposalId/cancel', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, proposalId } = req.params;

    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, teamId },
    });

    if (!proposal) {
      throw new NotFoundError('Proposal');
    }

    // Only author or admin can cancel
    if (proposal.authorId !== req.user!.id) {
      const membership = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: req.user!.id,
            teamId,
          },
        },
      });

      if (!membership || !['ADMIN', 'OWNER'].includes(membership.role)) {
        throw new BadRequestError('Only author or admin can cancel');
      }
    }

    if (!['DRAFT', 'PENDING'].includes(proposal.status)) {
      throw new BadRequestError('Cannot cancel proposal in current status');
    }

    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: 'CANCELLED',
        closedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default proposalsRouter;
