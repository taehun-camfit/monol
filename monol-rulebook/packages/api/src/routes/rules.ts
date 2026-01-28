/**
 * Rules Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import {
  requireAuth,
  requireTeamMember,
  optionalAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { NotFoundError, BadRequestError, ConflictError } from '../middleware/error.js';

export const rulesRouter = Router();

// ============================================================================
// Schemas
// ============================================================================

const createRuleSchema = z.object({
  teamId: z.string(),
  ruleId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string(),
  category: z.string(),
  severity: z.enum(['ERROR', 'WARNING', 'INFO']).default('WARNING'),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).default('TEAM'),
  content: z.string().optional(),
  examples: z.object({
    good: z.array(z.string()).optional(),
    bad: z.array(z.string()).optional(),
  }).optional(),
  conditions: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateRuleSchema = createRuleSchema.partial().omit({ teamId: true, ruleId: true });

const batchPushSchema = z.object({
  rules: z.array(createRuleSchema.omit({ teamId: true })),
  force: z.boolean().default(false),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/rules - List rules (public + user's team rules)
 */
rulesRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, category, tag, since, limit = '50', offset = '0' } = req.query;

    const where: Record<string, unknown> = {};

    // Filter by team or public
    if (teamId) {
      where.teamId = teamId;
    } else if (req.user) {
      // User's teams + public rules
      const memberships = await prisma.teamMember.findMany({
        where: { userId: req.user.id },
        select: { teamId: true },
      });
      const teamIds = memberships.map((m) => m.teamId);

      where.OR = [
        { teamId: { in: teamIds } },
        { visibility: 'PUBLIC' },
      ];
    } else {
      where.visibility = 'PUBLIC';
    }

    if (category) {
      where.category = { startsWith: category as string };
    }

    if (tag) {
      where.tags = { has: tag as string };
    }

    if (since) {
      where.updatedAt = { gte: new Date(since as string) };
    }

    const [rules, total] = await Promise.all([
      prisma.rule.findMany({
        where,
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        orderBy: { updatedAt: 'desc' },
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

    res.json({
      rules,
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
 * GET /api/rules/:ruleId - Get rule by ID
 */
rulesRouter.get('/:ruleId', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rule = await prisma.rule.findUnique({
      where: { id: req.params.ruleId },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        team: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { comments: true, versions: true },
        },
      },
    });

    if (!rule) {
      throw new NotFoundError('Rule');
    }

    // Check visibility
    if (rule.visibility !== 'PUBLIC') {
      if (!req.user) {
        throw new NotFoundError('Rule');
      }

      const membership = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: req.user.id,
            teamId: rule.teamId,
          },
        },
      });

      if (!membership) {
        throw new NotFoundError('Rule');
      }
    }

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Team-scoped Rules
// ============================================================================

/**
 * GET /api/teams/:teamId/rules - List team rules
 */
rulesRouter.get('/teams/:teamId/rules', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { category, tag, since, limit = '50', offset = '0' } = req.query;
    const teamId = req.params.teamId;

    const where: Record<string, unknown> = { teamId };

    if (category) {
      where.category = { startsWith: category as string };
    }

    if (tag) {
      where.tags = { has: tag as string };
    }

    if (since) {
      where.updatedAt = { gte: new Date(since as string) };
    }

    const [rules, total] = await Promise.all([
      prisma.rule.findMany({
        where,
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        orderBy: { updatedAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, displayName: true },
          },
        },
      }),
      prisma.rule.count({ where }),
    ]);

    res.json({
      rules,
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
 * POST /api/teams/:teamId/rules - Create rule
 */
rulesRouter.post('/teams/:teamId/rules', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;
    const data = createRuleSchema.omit({ teamId: true }).parse(req.body);

    // Check for duplicate ruleId
    const existing = await prisma.rule.findUnique({
      where: {
        teamId_ruleId: {
          teamId,
          ruleId: data.ruleId,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Rule with ID '${data.ruleId}' already exists`);
    }

    const rule = await prisma.rule.create({
      data: {
        ...data,
        teamId,
        authorId: req.user!.id,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    // Create initial version
    await prisma.ruleVersion.create({
      data: {
        ruleId: rule.id,
        version: rule.version,
        content: rule as unknown as Record<string, unknown>,
        changes: 'Initial version',
        authorId: req.user!.id,
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams/:teamId/rules/batch - Batch push rules
 */
rulesRouter.post('/teams/:teamId/rules/batch', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;
    const data = batchPushSchema.parse(req.body);

    const created: string[] = [];
    const updated: string[] = [];
    const conflicts: Array<{ ruleId: string; type: string }> = [];

    for (const ruleData of data.rules) {
      const existing = await prisma.rule.findUnique({
        where: {
          teamId_ruleId: {
            teamId,
            ruleId: ruleData.ruleId,
          },
        },
      });

      if (existing) {
        if (data.force) {
          // Force update
          await prisma.rule.update({
            where: { id: existing.id },
            data: {
              ...ruleData,
              version: incrementVersion(existing.version),
            },
          });
          updated.push(ruleData.ruleId);
        } else {
          // Report conflict
          conflicts.push({
            ruleId: ruleData.ruleId,
            type: 'concurrent_modification',
          });
        }
      } else {
        // Create new
        const rule = await prisma.rule.create({
          data: {
            ...ruleData,
            teamId,
            authorId: req.user!.id,
          },
        });

        await prisma.ruleVersion.create({
          data: {
            ruleId: rule.id,
            version: rule.version,
            content: rule as unknown as Record<string, unknown>,
            changes: 'Initial version',
            authorId: req.user!.id,
          },
        });

        created.push(ruleData.ruleId);
      }
    }

    if (conflicts.length > 0 && !data.force) {
      res.status(409).json({ created, updated, conflicts });
    } else {
      res.json({ created, updated, conflicts: [] });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:teamId/rules/:ruleId - Get team rule
 */
rulesRouter.get('/teams/:teamId/rules/:ruleId', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, ruleId } = req.params;

    const rule = await prisma.rule.findFirst({
      where: {
        teamId,
        OR: [
          { id: ruleId },
          { ruleId },
        ],
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { comments: true, versions: true },
        },
      },
    });

    if (!rule) {
      throw new NotFoundError('Rule');
    }

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/teams/:teamId/rules/:ruleId - Update rule
 */
rulesRouter.patch('/teams/:teamId/rules/:ruleId', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, ruleId } = req.params;
    const data = updateRuleSchema.parse(req.body);

    const existing = await prisma.rule.findFirst({
      where: {
        teamId,
        OR: [
          { id: ruleId },
          { ruleId },
        ],
      },
    });

    if (!existing) {
      throw new NotFoundError('Rule');
    }

    const newVersion = incrementVersion(existing.version);

    const rule = await prisma.rule.update({
      where: { id: existing.id },
      data: {
        ...data,
        version: newVersion,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    // Create version record
    await prisma.ruleVersion.create({
      data: {
        ruleId: rule.id,
        version: newVersion,
        content: rule as unknown as Record<string, unknown>,
        changes: 'Updated',
        authorId: req.user!.id,
      },
    });

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/teams/:teamId/rules/:ruleId - Delete rule
 */
rulesRouter.delete('/teams/:teamId/rules/:ruleId', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, ruleId } = req.params;

    const rule = await prisma.rule.findFirst({
      where: {
        teamId,
        OR: [
          { id: ruleId },
          { ruleId },
        ],
      },
    });

    if (!rule) {
      throw new NotFoundError('Rule');
    }

    await prisma.rule.delete({
      where: { id: rule.id },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:teamId/rules/:ruleId/history - Get rule version history
 */
rulesRouter.get('/teams/:teamId/rules/:ruleId/history', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, ruleId } = req.params;

    const rule = await prisma.rule.findFirst({
      where: {
        teamId,
        OR: [
          { id: ruleId },
          { ruleId },
        ],
      },
    });

    if (!rule) {
      throw new NotFoundError('Rule');
    }

    const versions = await prisma.ruleVersion.findMany({
      where: { ruleId: rule.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ versions });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Helpers
// ============================================================================

function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);
  if (parts.length >= 3) {
    parts[2]++;
  } else if (parts.length === 2) {
    parts.push(1);
  } else {
    parts.push(0, 1);
  }
  return parts.join('.');
}

export default rulesRouter;
