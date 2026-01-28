/**
 * Marketplace Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import {
  requireAuth,
  optionalAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { NotFoundError, BadRequestError } from '../middleware/error.js';

export const marketplaceRouter = Router();

// ============================================================================
// Public Marketplace
// ============================================================================

/**
 * GET /api/marketplace/rules - Search marketplace rules
 */
marketplaceRouter.get('/rules', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      q,
      category,
      tags,
      sort = 'downloads',
      limit = '20',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {
      visibility: 'PUBLIC',
      listedInMarketplace: true,
      archivedAt: null,
    };

    if (q) {
      where.OR = [
        { name: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
        { ruleId: { contains: q as string, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { startsWith: category as string };
    }

    if (tags) {
      const tagList = (tags as string).split(',');
      where.tags = { hasEvery: tagList };
    }

    const orderBy: Record<string, string> = {};
    switch (sort) {
      case 'downloads':
        orderBy.downloads = 'desc';
        break;
      case 'rating':
        orderBy.rating = 'desc';
        break;
      case 'recent':
        orderBy.publishedAt = 'desc';
        break;
      case 'name':
        orderBy.name = 'asc';
        break;
      default:
        orderBy.downloads = 'desc';
    }

    const [rules, total] = await Promise.all([
      prisma.rule.findMany({
        where,
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        orderBy,
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
 * GET /api/marketplace/rules/:ruleId - Get marketplace rule
 */
marketplaceRouter.get('/rules/:ruleId', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rule = await prisma.rule.findFirst({
      where: {
        OR: [
          { id: req.params.ruleId },
          { ruleId: req.params.ruleId },
        ],
        visibility: 'PUBLIC',
        listedInMarketplace: true,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        team: {
          select: { id: true, name: true, slug: true },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { adoptions: true, reviews: true },
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
 * POST /api/marketplace/rules/:ruleId/adopt - Adopt a marketplace rule
 */
marketplaceRouter.post('/rules/:ruleId/adopt', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, pinnedVersion, customizations } = req.body;

    if (!teamId) {
      throw new BadRequestError('Team ID required');
    }

    // Verify team membership
    const membership = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: req.user!.id,
          teamId,
        },
      },
    });

    if (!membership) {
      throw new BadRequestError('Not a member of the target team');
    }

    const rule = await prisma.rule.findFirst({
      where: {
        OR: [
          { id: req.params.ruleId },
          { ruleId: req.params.ruleId },
        ],
        visibility: 'PUBLIC',
        listedInMarketplace: true,
      },
    });

    if (!rule) {
      throw new NotFoundError('Rule');
    }

    // Check if already adopted
    const existing = await prisma.ruleAdoption.findUnique({
      where: {
        ruleId_adopterTeamId: {
          ruleId: rule.id,
          adopterTeamId: teamId,
        },
      },
    });

    if (existing) {
      throw new BadRequestError('Rule already adopted by this team');
    }

    // Create adoption record
    const adoption = await prisma.ruleAdoption.create({
      data: {
        ruleId: rule.id,
        adopterTeamId: teamId,
        pinnedVersion,
        customizations: customizations || {},
        customized: !!customizations,
      },
    });

    // Increment download count
    await prisma.rule.update({
      where: { id: rule.id },
      data: { downloads: { increment: 1 } },
    });

    res.status(201).json(adoption);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/marketplace/trending - Get trending rules
 */
marketplaceRouter.get('/trending', async (req, res, next) => {
  try {
    const rules = await prisma.rule.findMany({
      where: {
        visibility: 'PUBLIC',
        listedInMarketplace: true,
        archivedAt: null,
      },
      orderBy: [
        { downloads: 'desc' },
        { rating: 'desc' },
      ],
      take: 10,
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        team: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.json({ rules });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/marketplace/categories - Get categories
 */
marketplaceRouter.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.rule.groupBy({
      by: ['category'],
      where: {
        visibility: 'PUBLIC',
        listedInMarketplace: true,
        archivedAt: null,
      },
      _count: true,
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
    });

    const result = categories.map((c) => ({
      name: c.category,
      count: c._count,
    }));

    res.json({ categories: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/marketplace/collections - Get curated collections
 */
marketplaceRouter.get('/collections', async (req, res, next) => {
  try {
    const collections = await prisma.collection.findMany({
      where: { featured: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    res.json({ collections });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/marketplace/collections/:slug - Get collection
 */
marketplaceRouter.get('/collections/:slug', async (req, res, next) => {
  try {
    const collection = await prisma.collection.findUnique({
      where: { slug: req.params.slug },
    });

    if (!collection) {
      throw new NotFoundError('Collection');
    }

    // Get rules in collection
    const rules = await prisma.rule.findMany({
      where: {
        id: { in: collection.ruleIds },
        visibility: 'PUBLIC',
        listedInMarketplace: true,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    res.json({
      ...collection,
      rules,
    });
  } catch (error) {
    next(error);
  }
});

export default marketplaceRouter;
