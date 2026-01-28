/**
 * Notifications Routes
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { notificationService } from '../services/notification.js';

export const notificationsRouter = Router();

/**
 * GET /api/notifications - Get user notifications
 */
notificationsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { limit = '20', offset = '0', unread } = req.query;

    const result = await notificationService.getUserNotifications(req.user!.id, {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      unreadOnly: unread === 'true',
    });

    res.json({
      notifications: result.notifications,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/unread-count - Get unread count
 */
notificationsRouter.get('/unread-count', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/:id/read - Mark notification as read
 */
notificationsRouter.post('/:id/read', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/read-all - Mark all notifications as read
 */
notificationsRouter.post('/read-all', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/notifications/:id - Delete notification
 */
notificationsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.notification.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default notificationsRouter;
