/**
 * Analytics Routes
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
import { NotFoundError, BadRequestError } from '../middleware/error.js';

export const analyticsRouter = Router();

// ============================================================================
// Schemas
// ============================================================================

const trackEventSchema = z.object({
  eventType: z.string(),
  ruleId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const dateRangeSchema = z.object({
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/analytics/track - Track an event
 */
analyticsRouter.post('/track', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = trackEventSchema.parse(req.body);

    const event = await prisma.analyticsEvent.create({
      data: {
        userId: req.user!.id,
        eventType: data.eventType,
        ruleId: data.ruleId,
        metadata: data.metadata || {},
      },
    });

    res.status(201).json({ id: event.id });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:teamId/analytics/overview - Get team analytics overview
 */
analyticsRouter.get('/teams/:teamId/analytics/overview', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;

    const [
      totalRules,
      totalMembers,
      totalProposals,
      pendingProposals,
      recentActivity,
    ] = await Promise.all([
      prisma.rule.count({ where: { teamId } }),
      prisma.teamMember.count({ where: { teamId } }),
      prisma.proposal.count({ where: { teamId } }),
      prisma.proposal.count({ where: { teamId, status: 'PENDING' } }),
      prisma.activity.count({
        where: {
          teamId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Get adoption count for team's public rules
    const adoptions = await prisma.ruleAdoption.count({
      where: {
        rule: { teamId, visibility: 'PUBLIC' },
      },
    });

    res.json({
      totalRules,
      totalMembers,
      totalProposals,
      pendingProposals,
      recentActivity,
      adoptions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:teamId/analytics/rules - Get rule analytics
 */
analyticsRouter.get('/teams/:teamId/analytics/rules', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;

    // Rules by category
    const byCategory = await prisma.rule.groupBy({
      by: ['category'],
      where: { teamId },
      _count: true,
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
    });

    // Rules by severity
    const bySeverity = await prisma.rule.groupBy({
      by: ['severity'],
      where: { teamId },
      _count: true,
    });

    // Rules by visibility
    const byVisibility = await prisma.rule.groupBy({
      by: ['visibility'],
      where: { teamId },
      _count: true,
    });

    // Top downloaded rules
    const topDownloaded = await prisma.rule.findMany({
      where: { teamId, visibility: 'PUBLIC' },
      orderBy: { downloads: 'desc' },
      take: 10,
      select: {
        id: true,
        ruleId: true,
        name: true,
        downloads: true,
        rating: true,
      },
    });

    // Recent rules
    const recentRules = await prisma.rule.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        ruleId: true,
        name: true,
        createdAt: true,
        author: {
          select: { displayName: true },
        },
      },
    });

    res.json({
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count })),
      bySeverity: bySeverity.map((s) => ({ severity: s.severity, count: s._count })),
      byVisibility: byVisibility.map((v) => ({ visibility: v.visibility, count: v._count })),
      topDownloaded,
      recentRules,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:teamId/analytics/proposals - Get proposal analytics
 */
analyticsRouter.get('/teams/:teamId/analytics/proposals', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;

    // Proposals by status
    const byStatus = await prisma.proposal.groupBy({
      by: ['status'],
      where: { teamId },
      _count: true,
    });

    // Proposals by type
    const byType = await prisma.proposal.groupBy({
      by: ['type'],
      where: { teamId },
      _count: true,
    });

    // Average time to merge (for merged proposals)
    const mergedProposals = await prisma.proposal.findMany({
      where: { teamId, status: 'MERGED' },
      select: { createdAt: true, mergedAt: true },
    });

    let avgTimeToMerge = 0;
    if (mergedProposals.length > 0) {
      const totalTime = mergedProposals.reduce((sum, p) => {
        if (p.mergedAt) {
          return sum + (p.mergedAt.getTime() - p.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgTimeToMerge = totalTime / mergedProposals.length / (1000 * 60 * 60); // hours
    }

    // Top contributors (by proposals)
    const topContributors = await prisma.proposal.groupBy({
      by: ['authorId'],
      where: { teamId },
      _count: true,
      orderBy: {
        _count: {
          authorId: 'desc',
        },
      },
      take: 10,
    });

    // Get user details for top contributors
    const contributorIds = topContributors.map((c) => c.authorId);
    const users = await prisma.user.findMany({
      where: { id: { in: contributorIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });

    const contributorsWithDetails = topContributors.map((c) => ({
      user: users.find((u) => u.id === c.authorId),
      proposalCount: c._count,
    }));

    res.json({
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
      avgTimeToMergeHours: Math.round(avgTimeToMerge * 10) / 10,
      topContributors: contributorsWithDetails,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:teamId/analytics/members - Get member analytics
 */
analyticsRouter.get('/teams/:teamId/analytics/members', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;

    // Members by role
    const byRole = await prisma.teamMember.groupBy({
      by: ['role'],
      where: { teamId },
      _count: true,
    });

    // Member activity (by rules created)
    const memberActivity = await prisma.rule.groupBy({
      by: ['authorId'],
      where: { teamId },
      _count: true,
      orderBy: {
        _count: {
          authorId: 'desc',
        },
      },
      take: 10,
    });

    // Get member details
    const memberIds = memberActivity.map((m) => m.authorId);
    const members = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });

    const activityWithDetails = memberActivity.map((m) => ({
      user: members.find((u) => u.id === m.authorId),
      rulesCreated: m._count,
    }));

    // Points leaderboard
    const leaderboard = await prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { points: 'desc' },
      take: 10,
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    res.json({
      byRole: byRole.map((r) => ({ role: r.role, count: r._count })),
      topRuleCreators: activityWithDetails,
      leaderboard: leaderboard.map((m) => ({
        user: m.user,
        points: m.points,
        role: m.role,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:teamId/analytics/activity - Get activity timeline
 */
analyticsRouter.get('/teams/:teamId/analytics/activity', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);

    const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    // Get daily activity counts
    const activities = await prisma.activity.findMany({
      where: {
        teamId,
        createdAt: { gte: startDate },
      },
      select: {
        type: true,
        createdAt: true,
      },
    });

    // Group by date
    const byDate: Record<string, Record<string, number>> = {};
    activities.forEach((a) => {
      const date = a.createdAt.toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = {};
      }
      byDate[date][a.type] = (byDate[date][a.type] || 0) + 1;
    });

    // Fill in missing dates
    const result: Array<{ date: string; activities: Record<string, number> }> = [];
    for (let i = 0; i < daysNum; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      result.push({
        date,
        activities: byDate[date] || {},
      });
    }

    // Recent activity feed
    const recentActivities = await prisma.activity.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    res.json({
      timeline: result.reverse(),
      recent: recentActivities,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:teamId/analytics/trends - Get trend data
 */
analyticsRouter.get('/teams/:teamId/analytics/trends', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;

    // Get daily stats for the last 30 days
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        teamId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // If no stats exist, calculate them
    if (dailyStats.length === 0) {
      // Return empty trends
      res.json({
        rules: [],
        proposals: [],
        members: [],
      });
      return;
    }

    res.json({
      rules: dailyStats.map((s) => ({
        date: s.date.toISOString().split('T')[0],
        count: s.rulesCount,
      })),
      proposals: dailyStats.map((s) => ({
        date: s.date.toISOString().split('T')[0],
        count: s.proposalsCount,
      })),
      members: dailyStats.map((s) => ({
        date: s.date.toISOString().split('T')[0],
        count: s.membersCount,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams/:teamId/analytics/daily-stats - Generate daily stats (admin only)
 */
analyticsRouter.post('/teams/:teamId/analytics/daily-stats', requireAuth, requireTeamAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if stats already exist for today
    const existing = await prisma.dailyStats.findUnique({
      where: {
        teamId_date: {
          teamId,
          date: today,
        },
      },
    });

    if (existing) {
      res.json({ message: 'Stats already generated for today', stats: existing });
      return;
    }

    // Calculate stats
    const [rulesCount, proposalsCount, membersCount, activityCount] = await Promise.all([
      prisma.rule.count({ where: { teamId } }),
      prisma.proposal.count({ where: { teamId } }),
      prisma.teamMember.count({ where: { teamId } }),
      prisma.activity.count({
        where: {
          teamId,
          createdAt: {
            gte: new Date(today.getTime() - 24 * 60 * 60 * 1000),
            lt: today,
          },
        },
      }),
    ]);

    const stats = await prisma.dailyStats.create({
      data: {
        teamId,
        date: today,
        rulesCount,
        proposalsCount,
        membersCount,
        activityCount,
      },
    });

    res.status(201).json({ message: 'Daily stats generated', stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/me/analytics - Get personal analytics
 */
analyticsRouter.get('/users/me/analytics', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const [
      rulesCreated,
      proposalsCreated,
      reviewsGiven,
      commentsWritten,
    ] = await Promise.all([
      prisma.rule.count({ where: { authorId: userId } }),
      prisma.proposal.count({ where: { authorId: userId } }),
      prisma.proposalReview.count({ where: { reviewerId: userId } }),
      prisma.comment.count({ where: { authorId: userId } }),
    ]);

    // Get team memberships with points
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    const totalPoints = memberships.reduce((sum, m) => sum + m.points, 0);

    // Recent activity
    const recentActivity = await prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      rulesCreated,
      proposalsCreated,
      reviewsGiven,
      commentsWritten,
      totalPoints,
      teamMemberships: memberships.map((m) => ({
        team: m.team,
        role: m.role,
        points: m.points,
        joinedAt: m.joinedAt,
      })),
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
});

export default analyticsRouter;
