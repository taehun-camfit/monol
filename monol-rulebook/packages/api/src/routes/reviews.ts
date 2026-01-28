/**
 * Reviews Routes
 * 규칙 리뷰 및 평점 관리 API
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import {
  requireAuth,
  optionalAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../middleware/error.js';

export const reviewsRouter = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(10).max(5000),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(10).max(5000).optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
});

// ============================================================================
// Reviews CRUD
// ============================================================================

/**
 * GET /api/reviews/rule/:ruleId - Get reviews for a rule
 */
reviewsRouter.get('/rule/:ruleId', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sort = 'recent', limit = '20', offset = '0' } = req.query;

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

    const orderBy: Record<string, string> = {};
    switch (sort) {
      case 'recent':
        orderBy.createdAt = 'desc';
        break;
      case 'helpful':
        orderBy.helpfulCount = 'desc';
        break;
      case 'rating-high':
        orderBy.rating = 'desc';
        break;
      case 'rating-low':
        orderBy.rating = 'asc';
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    const [reviews, total, stats] = await Promise.all([
      prisma.ruleReview.findMany({
        where: { ruleId: rule.id },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        orderBy,
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.ruleReview.count({ where: { ruleId: rule.id } }),
      prisma.ruleReview.aggregate({
        where: { ruleId: rule.id },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    // Get rating distribution
    const distribution = await prisma.ruleReview.groupBy({
      by: ['rating'],
      where: { ruleId: rule.id },
      _count: true,
    });

    const ratingDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    };
    distribution.forEach((d) => {
      ratingDistribution[d.rating as 1 | 2 | 3 | 4 | 5] = d._count;
    });

    res.json({
      reviews,
      stats: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count,
        ratingDistribution,
      },
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
 * POST /api/reviews/rule/:ruleId - Create a review
 */
reviewsRouter.post('/rule/:ruleId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = createReviewSchema.parse(req.body);

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

    // Check if user has already reviewed this rule
    const existingReview = await prisma.ruleReview.findFirst({
      where: {
        ruleId: rule.id,
        authorId: req.user!.id,
      },
    });

    if (existingReview) {
      throw new BadRequestError('You have already reviewed this rule');
    }

    // Check if user has adopted the rule (verified review)
    const hasAdopted = await prisma.ruleAdoption.findFirst({
      where: {
        ruleId: rule.id,
        adopterTeam: {
          members: {
            some: { userId: req.user!.id },
          },
        },
      },
    });

    const review = await prisma.ruleReview.create({
      data: {
        ruleId: rule.id,
        authorId: req.user!.id,
        rating: data.rating,
        title: data.title,
        content: data.content,
        pros: data.pros || [],
        cons: data.cons || [],
        verified: !!hasAdopted,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Update rule rating
    const avgRating = await prisma.ruleReview.aggregate({
      where: { ruleId: rule.id },
      _avg: { rating: true },
    });

    await prisma.rule.update({
      where: { id: rule.id },
      data: { rating: avgRating._avg.rating || 0 },
    });

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/reviews/:reviewId - Update a review
 */
reviewsRouter.put('/:reviewId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = updateReviewSchema.parse(req.body);

    const review = await prisma.ruleReview.findUnique({
      where: { id: req.params.reviewId },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    if (review.authorId !== req.user!.id) {
      throw new ForbiddenError('Cannot update review by another user');
    }

    const updated = await prisma.ruleReview.update({
      where: { id: req.params.reviewId },
      data: {
        ...data,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Update rule rating if rating changed
    if (data.rating) {
      const avgRating = await prisma.ruleReview.aggregate({
        where: { ruleId: review.ruleId },
        _avg: { rating: true },
      });

      await prisma.rule.update({
        where: { id: review.ruleId },
        data: { rating: avgRating._avg.rating || 0 },
      });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/reviews/:reviewId - Delete a review
 */
reviewsRouter.delete('/:reviewId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const review = await prisma.ruleReview.findUnique({
      where: { id: req.params.reviewId },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    if (review.authorId !== req.user!.id) {
      throw new ForbiddenError('Cannot delete review by another user');
    }

    await prisma.ruleReview.delete({
      where: { id: req.params.reviewId },
    });

    // Update rule rating
    const avgRating = await prisma.ruleReview.aggregate({
      where: { ruleId: review.ruleId },
      _avg: { rating: true },
    });

    await prisma.rule.update({
      where: { id: review.ruleId },
      data: { rating: avgRating._avg.rating || 0 },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reviews/:reviewId/helpful - Mark review as helpful
 */
reviewsRouter.post('/:reviewId/helpful', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const review = await prisma.ruleReview.findUnique({
      where: { id: req.params.reviewId },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    // Check if already marked
    const existing = await prisma.reviewHelpful.findUnique({
      where: {
        reviewId_userId: {
          reviewId: req.params.reviewId,
          userId: req.user!.id,
        },
      },
    });

    if (existing) {
      // Remove the helpful mark
      await prisma.reviewHelpful.delete({
        where: {
          reviewId_userId: {
            reviewId: req.params.reviewId,
            userId: req.user!.id,
          },
        },
      });

      await prisma.ruleReview.update({
        where: { id: req.params.reviewId },
        data: { helpfulCount: { decrement: 1 } },
      });

      res.json({ marked: false });
    } else {
      // Add the helpful mark
      await prisma.reviewHelpful.create({
        data: {
          reviewId: req.params.reviewId,
          userId: req.user!.id,
        },
      });

      await prisma.ruleReview.update({
        where: { id: req.params.reviewId },
        data: { helpfulCount: { increment: 1 } },
      });

      res.json({ marked: true });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reviews/:reviewId/report - Report a review
 */
reviewsRouter.post('/:reviewId/report', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { reason, details } = req.body;

    if (!reason) {
      throw new BadRequestError('Report reason required');
    }

    const review = await prisma.ruleReview.findUnique({
      where: { id: req.params.reviewId },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    // Check if already reported by this user
    const existing = await prisma.reviewReport.findFirst({
      where: {
        reviewId: req.params.reviewId,
        reporterId: req.user!.id,
      },
    });

    if (existing) {
      throw new BadRequestError('You have already reported this review');
    }

    const report = await prisma.reviewReport.create({
      data: {
        reviewId: req.params.reviewId,
        reporterId: req.user!.id,
        reason,
        details,
      },
    });

    res.status(201).json({ reported: true, reportId: report.id });
  } catch (error) {
    next(error);
  }
});

export default reviewsRouter;
