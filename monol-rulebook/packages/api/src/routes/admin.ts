/**
 * Admin Routes
 *
 * Administrative endpoints for system management.
 * Requires admin authentication.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { ForbiddenError } from '../middleware/error.js';
import { logger } from '../utils/logger.js';

export const adminRouter = Router();

/**
 * Admin middleware - check if user is system admin
 */
function requireAdmin(req: Request, res: Response, next: () => void): void {
  const user = (req as unknown as { user?: { role?: string } }).user;
  if (!user || user.role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required');
  }
  next();
}

// Apply admin middleware to all routes
adminRouter.use(requireAdmin);

// ============================================================================
// Dashboard Statistics
// ============================================================================

/**
 * GET /admin/stats
 * Get system-wide statistics
 */
adminRouter.get('/stats', async (req: Request, res: Response) => {
  const [
    totalUsers,
    totalTeams,
    totalRules,
    totalProposals,
    totalMarketplaceRules,
    recentUsers,
    recentTeams,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.rule.count(),
    prisma.proposal.count(),
    prisma.marketplaceRule.count(),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.team.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  // Get activity trends
  const activityByDay = await prisma.$queryRaw<
    Array<{ date: string; users: number; rules: number; proposals: number }>
  >`
    SELECT
      DATE(created_at) as date,
      COUNT(DISTINCT CASE WHEN table_name = 'User' THEN id END) as users,
      COUNT(DISTINCT CASE WHEN table_name = 'Rule' THEN id END) as rules,
      COUNT(DISTINCT CASE WHEN table_name = 'Proposal' THEN id END) as proposals
    FROM (
      SELECT id, created_at, 'User' as table_name FROM "User"
      UNION ALL
      SELECT id, created_at, 'Rule' as table_name FROM "Rule"
      UNION ALL
      SELECT id, created_at, 'Proposal' as table_name FROM "Proposal"
    ) combined
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `;

  res.json({
    totals: {
      users: totalUsers,
      teams: totalTeams,
      rules: totalRules,
      proposals: totalProposals,
      marketplaceRules: totalMarketplaceRules,
    },
    recent: {
      users: recentUsers,
      teams: recentTeams,
    },
    trends: activityByDay,
  });
});

/**
 * GET /admin/health
 * Get detailed system health status
 */
adminRouter.get('/health', async (req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latency: Date.now() - dbStart };
  } catch (error) {
    checks.database = { status: 'unhealthy', error: String(error) };
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  checks.memory = {
    status: memUsage.heapUsed < memUsage.heapTotal * 0.9 ? 'healthy' : 'warning',
    latency: undefined,
  };

  // Overall status
  const overallStatus = Object.values(checks).every((c) => c.status === 'healthy')
    ? 'healthy'
    : Object.values(checks).some((c) => c.status === 'unhealthy')
      ? 'unhealthy'
      : 'warning';

  res.json({
    status: overallStatus,
    checks,
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    },
    version: process.env.npm_package_version || '0.1.0',
  });
});

// ============================================================================
// User Management
// ============================================================================

/**
 * GET /admin/users
 * List all users with filters
 */
adminRouter.get('/users', async (req: Request, res: Response) => {
  const { page = '1', limit = '20', q, role, sort = 'createdAt', order = 'desc' } = req.query;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q as string, mode: 'insensitive' } },
      { email: { contains: q as string, mode: 'insensitive' } },
    ];
  }
  if (role) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
      take: parseInt(limit as string, 10),
      orderBy: { [sort as string]: order },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            teams: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    users,
    pagination: {
      total,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      totalPages: Math.ceil(total / parseInt(limit as string, 10)),
    },
  });
});

/**
 * PATCH /admin/users/:id
 * Update user (role, ban status, etc.)
 */
adminRouter.patch('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, isBanned, banReason } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(role && { role }),
      ...(typeof isBanned === 'boolean' && { isBanned }),
      ...(banReason && { banReason }),
    },
  });

  // Log admin action
  await logAdminAction(req, 'UPDATE_USER', { userId: id, changes: { role, isBanned } });

  res.json(user);
});

/**
 * DELETE /admin/users/:id
 * Delete user account
 */
adminRouter.delete('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.user.delete({
    where: { id },
  });

  // Log admin action
  await logAdminAction(req, 'DELETE_USER', { userId: id });

  res.status(204).send();
});

// ============================================================================
// Team Management
// ============================================================================

/**
 * GET /admin/teams
 * List all teams with filters
 */
adminRouter.get('/teams', async (req: Request, res: Response) => {
  const { page = '1', limit = '20', q, sort = 'createdAt', order = 'desc' } = req.query;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q as string, mode: 'insensitive' } },
      { slug: { contains: q as string, mode: 'insensitive' } },
    ];
  }

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      skip: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
      take: parseInt(limit as string, 10),
      orderBy: { [sort as string]: order },
      include: {
        _count: {
          select: {
            members: true,
            rules: true,
          },
        },
      },
    }),
    prisma.team.count({ where }),
  ]);

  res.json({
    teams,
    pagination: {
      total,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      totalPages: Math.ceil(total / parseInt(limit as string, 10)),
    },
  });
});

/**
 * DELETE /admin/teams/:slug
 * Delete team
 */
adminRouter.delete('/teams/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;

  await prisma.team.delete({
    where: { slug },
  });

  // Log admin action
  await logAdminAction(req, 'DELETE_TEAM', { teamSlug: slug });

  res.status(204).send();
});

// ============================================================================
// Reports Management
// ============================================================================

/**
 * GET /admin/reports
 * List all reports (flagged content)
 */
adminRouter.get('/reports', async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status = 'pending' } = req.query;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where: { status: status as string },
      skip: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
      take: parseInt(limit as string, 10),
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.report.count({ where: { status: status as string } }),
  ]);

  res.json({
    reports,
    pagination: {
      total,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      totalPages: Math.ceil(total / parseInt(limit as string, 10)),
    },
  });
});

/**
 * PATCH /admin/reports/:id
 * Resolve a report
 */
adminRouter.patch('/reports/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, resolution } = req.body;

  const report = await prisma.report.update({
    where: { id },
    data: {
      status,
      resolution,
      resolvedAt: status === 'resolved' ? new Date() : undefined,
    },
  });

  // Log admin action
  await logAdminAction(req, 'RESOLVE_REPORT', { reportId: id, resolution });

  res.json(report);
});

// ============================================================================
// Audit Logs
// ============================================================================

/**
 * GET /admin/audit-logs
 * List audit logs
 */
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '50',
    action,
    userId,
    startDate,
    endDate,
  } = req.query;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: new Date(startDate as string) }),
      ...(endDate && { lte: new Date(endDate as string) }),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
      take: parseInt(limit as string, 10),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    logs,
    pagination: {
      total,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      totalPages: Math.ceil(total / parseInt(limit as string, 10)),
    },
  });
});

// ============================================================================
// System Settings
// ============================================================================

/**
 * GET /admin/settings
 * Get system settings
 */
adminRouter.get('/settings', async (req: Request, res: Response) => {
  const settings = await prisma.systemSetting.findMany();

  const settingsMap = settings.reduce(
    (acc, s) => {
      acc[s.key] = s.value;
      return acc;
    },
    {} as Record<string, string>
  );

  res.json(settingsMap);
});

/**
 * PATCH /admin/settings
 * Update system settings
 */
adminRouter.patch('/settings', async (req: Request, res: Response) => {
  const settings = req.body;

  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  // Log admin action
  await logAdminAction(req, 'UPDATE_SETTINGS', { changes: settings });

  res.json({ success: true });
});

// ============================================================================
// Helper Functions
// ============================================================================

async function logAdminAction(
  req: Request,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  const user = (req as unknown as { user?: { id: string } }).user;
  if (!user) return;

  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        details,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });
  } catch (error) {
    logger.error({ error, action }, 'Failed to log admin action');
  }
}

export default adminRouter;
