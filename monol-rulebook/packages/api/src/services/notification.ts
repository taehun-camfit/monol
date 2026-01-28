/**
 * Notification Service
 * 알림 생성 및 발송 서비스
 */

import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

export type NotificationType =
  | 'PROPOSAL_CREATED'
  | 'PROPOSAL_SUBMITTED'
  | 'PROPOSAL_APPROVED'
  | 'PROPOSAL_REJECTED'
  | 'PROPOSAL_MERGED'
  | 'PROPOSAL_CANCELLED'
  | 'REVIEW_REQUESTED'
  | 'COMMENT_ADDED'
  | 'MENTION'
  | 'TEAM_INVITE'
  | 'RULE_ADOPTED';

interface NotificationData {
  type: NotificationType;
  userId: string;
  teamId?: string;
  proposalId?: string;
  ruleId?: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}

interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export class NotificationService {
  /**
   * 알림 생성
   */
  async create(data: NotificationData): Promise<void> {
    try {
      // Don't notify the actor
      if (data.userId === data.actorId) {
        return;
      }

      const { title, message, link } = this.formatNotification(data);

      await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title,
          message,
          link,
          teamId: data.teamId,
          proposalId: data.proposalId,
          ruleId: data.ruleId,
          actorId: data.actorId,
          metadata: data.metadata || {},
        },
      });

      logger.info({ type: data.type, userId: data.userId }, 'Notification created');

      // TODO: Send push notification, email, etc.
    } catch (error) {
      logger.error({ error, data }, 'Failed to create notification');
    }
  }

  /**
   * 다수 사용자에게 알림 생성
   */
  async createBulk(
    userIds: string[],
    data: Omit<NotificationData, 'userId'>
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)].filter(
      (id) => id !== data.actorId
    );

    await Promise.all(
      uniqueUserIds.map((userId) => this.create({ ...data, userId }))
    );
  }

  /**
   * 팀 멤버 전체에게 알림 생성
   */
  async notifyTeam(
    teamId: string,
    data: Omit<NotificationData, 'userId' | 'teamId'>
  ): Promise<void> {
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      select: { userId: true },
    });

    const userIds = members.map((m) => m.userId);
    await this.createBulk(userIds, { ...data, teamId });
  }

  /**
   * 사용자의 알림 목록 조회
   */
  async getUserNotifications(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<{ notifications: NotificationPayload[]; total: number }> {
    const where: Record<string, unknown> = { userId };
    if (options?.unreadOnly) {
      where.readAt = null;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        link: n.link || undefined,
        metadata: n.metadata as Record<string, unknown> | undefined,
        createdAt: n.createdAt,
      })),
      total,
    };
  }

  /**
   * 알림 읽음 처리
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * 읽지 않은 알림 개수
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  /**
   * 알림 포맷팅
   */
  private formatNotification(data: NotificationData): {
    title: string;
    message: string;
    link?: string;
  } {
    const formats: Record<
      NotificationType,
      (data: NotificationData) => { title: string; message: string; link?: string }
    > = {
      PROPOSAL_CREATED: () => ({
        title: '새 제안',
        message: '새로운 제안이 생성되었습니다.',
        link: data.proposalId
          ? `/teams/${data.teamId}/proposals/${data.proposalId}`
          : undefined,
      }),
      PROPOSAL_SUBMITTED: () => ({
        title: '제안 제출됨',
        message: '제안이 검토를 위해 제출되었습니다.',
        link: data.proposalId
          ? `/teams/${data.teamId}/proposals/${data.proposalId}`
          : undefined,
      }),
      PROPOSAL_APPROVED: () => ({
        title: '제안 승인됨',
        message: '제안이 승인되었습니다.',
        link: data.proposalId
          ? `/teams/${data.teamId}/proposals/${data.proposalId}`
          : undefined,
      }),
      PROPOSAL_REJECTED: () => ({
        title: '제안 거절됨',
        message: '제안이 거절되었습니다.',
        link: data.proposalId
          ? `/teams/${data.teamId}/proposals/${data.proposalId}`
          : undefined,
      }),
      PROPOSAL_MERGED: () => ({
        title: '제안 병합됨',
        message: '제안이 성공적으로 병합되었습니다.',
        link: data.proposalId
          ? `/teams/${data.teamId}/proposals/${data.proposalId}`
          : undefined,
      }),
      PROPOSAL_CANCELLED: () => ({
        title: '제안 취소됨',
        message: '제안이 취소되었습니다.',
        link: data.proposalId
          ? `/teams/${data.teamId}/proposals/${data.proposalId}`
          : undefined,
      }),
      REVIEW_REQUESTED: () => ({
        title: '리뷰 요청',
        message: '제안에 대한 리뷰가 요청되었습니다.',
        link: data.proposalId
          ? `/teams/${data.teamId}/proposals/${data.proposalId}`
          : undefined,
      }),
      COMMENT_ADDED: () => ({
        title: '새 댓글',
        message: '제안에 새 댓글이 달렸습니다.',
        link: data.proposalId
          ? `/teams/${data.teamId}/proposals/${data.proposalId}`
          : undefined,
      }),
      MENTION: () => ({
        title: '멘션',
        message: '누군가가 당신을 멘션했습니다.',
        link: data.proposalId
          ? `/teams/${data.teamId}/proposals/${data.proposalId}`
          : undefined,
      }),
      TEAM_INVITE: () => ({
        title: '팀 초대',
        message: '팀에 초대되었습니다.',
        link: `/teams/${data.teamId}`,
      }),
      RULE_ADOPTED: () => ({
        title: '규칙 채택됨',
        message: '규칙이 채택되었습니다.',
        link: data.ruleId ? `/rules/${data.ruleId}` : undefined,
      }),
    };

    return formats[data.type](data);
  }
}

export const notificationService = new NotificationService();
