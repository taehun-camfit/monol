/**
 * Analytics Collector Service
 * 분석 데이터 수집 서비스
 */

import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

export type AnalyticsEventType =
  | 'RULE_VIEW'
  | 'RULE_SEARCH'
  | 'RULE_CREATE'
  | 'RULE_UPDATE'
  | 'RULE_DELETE'
  | 'RULE_ADOPT'
  | 'PROPOSAL_CREATE'
  | 'PROPOSAL_REVIEW'
  | 'PROPOSAL_MERGE'
  | 'USER_LOGIN'
  | 'USER_SIGNUP'
  | 'TEAM_JOIN'
  | 'MARKETPLACE_SEARCH';

interface EventData {
  type: AnalyticsEventType;
  userId?: string;
  teamId?: string;
  ruleId?: string;
  proposalId?: string;
  metadata?: Record<string, unknown>;
}

export class AnalyticsCollector {
  /**
   * 이벤트 기록
   */
  async track(data: EventData): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType: data.type,
          userId: data.userId,
          teamId: data.teamId,
          ruleId: data.ruleId,
          proposalId: data.proposalId,
          metadata: data.metadata || {},
        },
      });

      logger.debug({ type: data.type }, 'Analytics event tracked');
    } catch (error) {
      logger.error({ error, data }, 'Failed to track analytics event');
    }
  }

  /**
   * 배치 이벤트 기록
   */
  async trackBatch(events: EventData[]): Promise<void> {
    try {
      await prisma.analyticsEvent.createMany({
        data: events.map((e) => ({
          eventType: e.type,
          userId: e.userId,
          teamId: e.teamId,
          ruleId: e.ruleId,
          proposalId: e.proposalId,
          metadata: e.metadata || {},
        })),
      });

      logger.debug({ count: events.length }, 'Analytics events batch tracked');
    } catch (error) {
      logger.error({ error, count: events.length }, 'Failed to batch track events');
    }
  }

  /**
   * 규칙 조회 이벤트
   */
  async trackRuleView(
    ruleId: string,
    userId?: string,
    source?: 'marketplace' | 'team' | 'direct'
  ): Promise<void> {
    await this.track({
      type: 'RULE_VIEW',
      ruleId,
      userId,
      metadata: { source },
    });

    // Increment view count (optional)
    // await prisma.rule.update({
    //   where: { id: ruleId },
    //   data: { viewCount: { increment: 1 } },
    // });
  }

  /**
   * 검색 이벤트
   */
  async trackSearch(
    query: string,
    userId?: string,
    results: number = 0,
    source?: 'marketplace' | 'team'
  ): Promise<void> {
    await this.track({
      type: source === 'marketplace' ? 'MARKETPLACE_SEARCH' : 'RULE_SEARCH',
      userId,
      metadata: { query, results },
    });
  }

  /**
   * 규칙 채택 이벤트
   */
  async trackAdoption(
    ruleId: string,
    teamId: string,
    userId: string
  ): Promise<void> {
    await this.track({
      type: 'RULE_ADOPT',
      ruleId,
      teamId,
      userId,
    });
  }

  /**
   * 기간별 이벤트 집계
   */
  async getEventCountsByType(
    startDate: Date,
    endDate: Date,
    teamId?: string
  ): Promise<Record<string, number>> {
    const where: Record<string, unknown> = {
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
    };

    if (teamId) {
      where.teamId = teamId;
    }

    const events = await prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where,
      _count: true,
    });

    return events.reduce(
      (acc, e) => {
        acc[e.eventType] = e._count;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * 사용자 활동 요약
   */
  async getUserActivitySummary(
    userId: string,
    days: number = 30
  ): Promise<{
    totalEvents: number;
    byType: Record<string, number>;
    dailyActivity: { date: string; count: number }[];
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = await prisma.analyticsEvent.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      select: {
        eventType: true,
        createdAt: true,
      },
    });

    const byType: Record<string, number> = {};
    const byDate: Record<string, number> = {};

    events.forEach((e) => {
      // By type
      byType[e.eventType] = (byType[e.eventType] || 0) + 1;

      // By date
      const date = e.createdAt.toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });

    const dailyActivity = Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalEvents: events.length,
      byType,
      dailyActivity,
    };
  }

  /**
   * 인기 규칙 집계
   */
  async getPopularRules(
    days: number = 30,
    limit: number = 10
  ): Promise<{ ruleId: string; views: number; adoptions: number }[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const views = await prisma.analyticsEvent.groupBy({
      by: ['ruleId'],
      where: {
        eventType: 'RULE_VIEW',
        ruleId: { not: null },
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: {
        _count: {
          ruleId: 'desc',
        },
      },
      take: limit,
    });

    const adoptions = await prisma.analyticsEvent.groupBy({
      by: ['ruleId'],
      where: {
        eventType: 'RULE_ADOPT',
        ruleId: { not: null },
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    const adoptionMap = new Map(
      adoptions.map((a) => [a.ruleId!, a._count])
    );

    return views
      .filter((v) => v.ruleId)
      .map((v) => ({
        ruleId: v.ruleId!,
        views: v._count,
        adoptions: adoptionMap.get(v.ruleId!) || 0,
      }));
  }
}

export const analyticsCollector = new AnalyticsCollector();
