/**
 * Reviewer Assignment Service
 * 리뷰어 자동 할당 서비스
 */

import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';
import { notificationService } from './notification.js';

interface ReviewerCandidate {
  userId: string;
  username: string;
  displayName: string;
  score: number;
  reasons: string[];
}

interface AssignmentOptions {
  excludeAuthor?: boolean;
  minReviewers?: number;
  maxReviewers?: number;
  preferExpertsInCategory?: boolean;
  preferActivemembers?: boolean;
}

export class ReviewerAssignmentService {
  /**
   * 제안에 대한 리뷰어 추천
   */
  async suggestReviewers(
    proposalId: string,
    options: AssignmentOptions = {}
  ): Promise<ReviewerCandidate[]> {
    const {
      excludeAuthor = true,
      maxReviewers = 5,
      preferExpertsInCategory = true,
      preferActivemembers = true,
    } = options;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        rule: true,
        team: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const changes = proposal.changes as Record<string, unknown>;
    const category = proposal.rule?.category || (changes?.category as string);
    const tags = proposal.rule?.tags || (changes?.tags as string[]) || [];

    // Get eligible members (exclude author if specified)
    let members = proposal.team.members;
    if (excludeAuthor) {
      members = members.filter((m) => m.userId !== proposal.authorId);
    }

    // Filter to only members who can review (not VIEWER)
    members = members.filter((m) => m.role !== 'VIEWER');

    // Calculate scores for each member
    const candidates: ReviewerCandidate[] = await Promise.all(
      members.map(async (member) => {
        let score = 0;
        const reasons: string[] = [];

        // Base score for being a team member
        score += 10;
        reasons.push('Team member');

        // Admin/Owner bonus
        if (['ADMIN', 'OWNER'].includes(member.role)) {
          score += 5;
          reasons.push(`Role: ${member.role}`);
        }

        // Check expertise in category
        if (preferExpertsInCategory && category) {
          const rulesInCategory = await prisma.rule.count({
            where: {
              authorId: member.userId,
              category: { startsWith: category.split('/')[0] },
            },
          });
          if (rulesInCategory > 0) {
            score += Math.min(rulesInCategory * 3, 15);
            reasons.push(`${rulesInCategory} rules in ${category.split('/')[0]}`);
          }
        }

        // Check recent review activity
        if (preferActivemembers) {
          const recentReviews = await prisma.proposalReview.count({
            where: {
              reviewerId: member.userId,
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          });
          if (recentReviews > 0) {
            score += Math.min(recentReviews * 2, 10);
            reasons.push(`${recentReviews} recent reviews`);
          }
        }

        // Check tag overlap
        if (tags.length > 0) {
          const userRulesWithTags = await prisma.rule.findMany({
            where: {
              authorId: member.userId,
              tags: { hasSome: tags },
            },
            select: { tags: true },
          });
          if (userRulesWithTags.length > 0) {
            score += 5;
            reasons.push('Expertise in related tags');
          }
        }

        // Points-based bonus
        if (member.points > 0) {
          score += Math.min(Math.floor(member.points / 10), 10);
          reasons.push(`${member.points} contribution points`);
        }

        return {
          userId: member.userId,
          username: member.user.username,
          displayName: member.user.displayName,
          score,
          reasons,
        };
      })
    );

    // Sort by score and limit
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, maxReviewers);
  }

  /**
   * 리뷰어 자동 할당
   */
  async autoAssign(
    proposalId: string,
    options: AssignmentOptions = {}
  ): Promise<string[]> {
    const { minReviewers = 1 } = options;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { team: true },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const candidates = await this.suggestReviewers(proposalId, options);

    if (candidates.length < minReviewers) {
      logger.warn(
        { proposalId, candidates: candidates.length, required: minReviewers },
        'Not enough reviewer candidates'
      );
    }

    const assignedReviewers = candidates.slice(0, minReviewers);

    // Send notifications to assigned reviewers
    await Promise.all(
      assignedReviewers.map((reviewer) =>
        notificationService.create({
          type: 'REVIEW_REQUESTED',
          userId: reviewer.userId,
          teamId: proposal.teamId,
          proposalId,
          actorId: proposal.authorId,
        })
      )
    );

    logger.info(
      {
        proposalId,
        reviewers: assignedReviewers.map((r) => r.username),
      },
      'Reviewers auto-assigned'
    );

    return assignedReviewers.map((r) => r.userId);
  }

  /**
   * 리뷰어 수동 요청
   */
  async requestReview(
    proposalId: string,
    reviewerIds: string[],
    requesterId: string
  ): Promise<void> {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Validate that all reviewers are team members
    const members = await prisma.teamMember.findMany({
      where: {
        teamId: proposal.teamId,
        userId: { in: reviewerIds },
      },
    });

    if (members.length !== reviewerIds.length) {
      throw new Error('Some reviewers are not team members');
    }

    // Send notifications
    await Promise.all(
      reviewerIds.map((reviewerId) =>
        notificationService.create({
          type: 'REVIEW_REQUESTED',
          userId: reviewerId,
          teamId: proposal.teamId,
          proposalId,
          actorId: requesterId,
        })
      )
    );

    logger.info({ proposalId, reviewerIds }, 'Review requested');
  }
}

export const reviewerAssignmentService = new ReviewerAssignmentService();
