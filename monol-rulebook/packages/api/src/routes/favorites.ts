/**
 * Favorites Routes
 * 즐겨찾기 및 북마크 관리 API
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { NotFoundError, BadRequestError } from '../middleware/error.js';

export const favoritesRouter = Router();

// ============================================================================
// Favorites CRUD
// ============================================================================

/**
 * GET /api/favorites - Get user's favorites
 */
favoritesRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { type, limit = '50', offset = '0' } = req.query;

    const where: Record<string, unknown> = {
      userId: req.user!.id,
    };

    if (type) {
      where.type = type;
    }

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.favorite.count({ where }),
    ]);

    // Fetch the actual items
    const ruleIds = favorites
      .filter((f) => f.type === 'RULE')
      .map((f) => f.targetId);
    const collectionIds = favorites
      .filter((f) => f.type === 'COLLECTION')
      .map((f) => f.targetId);
    const teamIds = favorites
      .filter((f) => f.type === 'TEAM')
      .map((f) => f.targetId);

    const [rules, collections, teams] = await Promise.all([
      ruleIds.length > 0
        ? prisma.rule.findMany({
            where: { id: { in: ruleIds }, visibility: 'PUBLIC' },
            include: {
              author: {
                select: { id: true, username: true, displayName: true, avatarUrl: true },
              },
              team: {
                select: { id: true, name: true, slug: true },
              },
            },
          })
        : [],
      collectionIds.length > 0
        ? prisma.collection.findMany({
            where: { id: { in: collectionIds } },
          })
        : [],
      teamIds.length > 0
        ? prisma.team.findMany({
            where: { id: { in: teamIds } },
            select: { id: true, name: true, slug: true, avatarUrl: true },
          })
        : [],
    ]);

    // Map favorites to their items
    const items = favorites.map((fav) => {
      let item: unknown = null;
      switch (fav.type) {
        case 'RULE':
          item = rules.find((r) => r.id === fav.targetId);
          break;
        case 'COLLECTION':
          item = collections.find((c) => c.id === fav.targetId);
          break;
        case 'TEAM':
          item = teams.find((t) => t.id === fav.targetId);
          break;
      }
      return {
        id: fav.id,
        type: fav.type,
        createdAt: fav.createdAt,
        item,
      };
    });

    res.json({
      favorites: items,
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
 * POST /api/favorites/rules/:ruleId - Add rule to favorites
 */
favoritesRouter.post('/rules/:ruleId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rule = await prisma.rule.findFirst({
      where: {
        OR: [
          { id: req.params.ruleId },
          { ruleId: req.params.ruleId },
        ],
        visibility: 'PUBLIC',
      },
    });

    if (!rule) {
      throw new NotFoundError('Rule');
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_type_targetId: {
          userId: req.user!.id,
          type: 'RULE',
          targetId: rule.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestError('Rule already in favorites');
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user!.id,
        type: 'RULE',
        targetId: rule.id,
      },
    });

    res.status(201).json(favorite);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/favorites/rules/:ruleId - Remove rule from favorites
 */
favoritesRouter.delete('/rules/:ruleId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rule = await prisma.rule.findFirst({
      where: {
        OR: [
          { id: req.params.ruleId },
          { ruleId: req.params.ruleId },
        ],
      },
    });

    if (!rule) {
      throw new NotFoundError('Rule');
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_type_targetId: {
          userId: req.user!.id,
          type: 'RULE',
          targetId: rule.id,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundError('Favorite');
    }

    await prisma.favorite.delete({
      where: { id: favorite.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/favorites/rules/:ruleId/status - Check if rule is favorited
 */
favoritesRouter.get('/rules/:ruleId/status', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rule = await prisma.rule.findFirst({
      where: {
        OR: [
          { id: req.params.ruleId },
          { ruleId: req.params.ruleId },
        ],
      },
    });

    if (!rule) {
      throw new NotFoundError('Rule');
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_type_targetId: {
          userId: req.user!.id,
          type: 'RULE',
          targetId: rule.id,
        },
      },
    });

    res.json({ favorited: !!favorite });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/favorites/collections/:collectionId - Add collection to favorites
 */
favoritesRouter.post('/collections/:collectionId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const collection = await prisma.collection.findUnique({
      where: { id: req.params.collectionId },
    });

    if (!collection) {
      throw new NotFoundError('Collection');
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_type_targetId: {
          userId: req.user!.id,
          type: 'COLLECTION',
          targetId: collection.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestError('Collection already in favorites');
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user!.id,
        type: 'COLLECTION',
        targetId: collection.id,
      },
    });

    res.status(201).json(favorite);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/favorites/collections/:collectionId - Remove collection from favorites
 */
favoritesRouter.delete('/collections/:collectionId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_type_targetId: {
          userId: req.user!.id,
          type: 'COLLECTION',
          targetId: req.params.collectionId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundError('Favorite');
    }

    await prisma.favorite.delete({
      where: { id: favorite.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/favorites/teams/:teamId - Add team to favorites
 */
favoritesRouter.post('/teams/:teamId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
    });

    if (!team) {
      throw new NotFoundError('Team');
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_type_targetId: {
          userId: req.user!.id,
          type: 'TEAM',
          targetId: team.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestError('Team already in favorites');
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user!.id,
        type: 'TEAM',
        targetId: team.id,
      },
    });

    res.status(201).json(favorite);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/favorites/teams/:teamId - Remove team from favorites
 */
favoritesRouter.delete('/teams/:teamId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_type_targetId: {
          userId: req.user!.id,
          type: 'TEAM',
          targetId: req.params.teamId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundError('Favorite');
    }

    await prisma.favorite.delete({
      where: { id: favorite.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default favoritesRouter;
