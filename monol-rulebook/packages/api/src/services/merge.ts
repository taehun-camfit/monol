/**
 * Merge Service
 * 제안 병합 로직
 */

import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';
import { notificationService } from './notification.js';

export type MergeResult = {
  success: boolean;
  ruleId?: string;
  error?: string;
};

interface MergeContext {
  proposalId: string;
  teamId: string;
  userId: string;
}

export class MergeService {
  /**
   * 제안 병합 가능 여부 확인
   */
  async canMerge(proposalId: string): Promise<{ canMerge: boolean; reason?: string }> {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        rule: true,
        team: true,
      },
    });

    if (!proposal) {
      return { canMerge: false, reason: 'Proposal not found' };
    }

    if (proposal.status !== 'APPROVED') {
      return {
        canMerge: false,
        reason: `Proposal must be approved before merging. Current status: ${proposal.status}`,
      };
    }

    // Check for conflicts
    if (proposal.type === 'UPDATE' && proposal.ruleId) {
      const currentRule = await prisma.rule.findUnique({
        where: { id: proposal.ruleId },
      });

      if (!currentRule) {
        return {
          canMerge: false,
          reason: 'Target rule no longer exists',
        };
      }

      // Check if rule was modified after proposal was created
      if (currentRule.updatedAt > proposal.createdAt) {
        return {
          canMerge: false,
          reason: 'Target rule was modified after proposal was created. Please resolve conflicts.',
        };
      }
    }

    return { canMerge: true };
  }

  /**
   * 제안 병합 실행
   */
  async merge(context: MergeContext): Promise<MergeResult> {
    const { proposalId, teamId, userId } = context;

    try {
      // Check if can merge
      const { canMerge, reason } = await this.canMerge(proposalId);
      if (!canMerge) {
        return { success: false, error: reason };
      }

      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          author: true,
          reviews: true,
        },
      });

      if (!proposal) {
        return { success: false, error: 'Proposal not found' };
      }

      const changes = proposal.changes as Record<string, unknown>;
      let ruleId: string | undefined;

      // Execute merge in transaction
      await prisma.$transaction(async (tx) => {
        switch (proposal.type) {
          case 'CREATE': {
            const rule = await tx.rule.create({
              data: {
                teamId,
                authorId: proposal.authorId,
                ruleId: changes.ruleId as string,
                name: changes.name as string,
                description: changes.description as string,
                category: changes.category as string,
                severity: (changes.severity as 'ERROR' | 'WARNING' | 'INFO') || 'WARNING',
                tags: (changes.tags as string[]) || [],
                content: changes.content as string | undefined,
                examples: changes.examples as Record<string, unknown> | undefined,
                conditions: changes.conditions as Record<string, unknown> | undefined,
                metadata: changes.metadata as Record<string, unknown> | undefined,
                visibility: (changes.visibility as 'PRIVATE' | 'TEAM' | 'PUBLIC') || 'TEAM',
              },
            });

            // Create initial version
            await tx.ruleVersion.create({
              data: {
                ruleId: rule.id,
                version: rule.version,
                content: rule as unknown as Record<string, unknown>,
                changes: `Created via proposal #${proposal.id}`,
                authorId: userId,
              },
            });

            ruleId = rule.id;

            // Create activity
            await tx.activity.create({
              data: {
                teamId,
                userId,
                ruleId: rule.id,
                proposalId,
                type: 'RULE_CREATED',
                description: `Created rule "${rule.name}" via proposal`,
              },
            });
            break;
          }

          case 'UPDATE': {
            if (!proposal.ruleId) {
              throw new Error('Rule ID is required for UPDATE proposal');
            }

            const existingRule = await tx.rule.findUnique({
              where: { id: proposal.ruleId },
            });

            if (!existingRule) {
              throw new Error('Target rule not found');
            }

            const newVersion = this.incrementVersion(existingRule.version);

            const updatedRule = await tx.rule.update({
              where: { id: proposal.ruleId },
              data: {
                ...changes,
                version: newVersion,
              },
            });

            // Create version record
            await tx.ruleVersion.create({
              data: {
                ruleId: updatedRule.id,
                version: newVersion,
                content: updatedRule as unknown as Record<string, unknown>,
                changes: `Updated via proposal #${proposal.id}`,
                authorId: userId,
              },
            });

            ruleId = updatedRule.id;

            // Create activity
            await tx.activity.create({
              data: {
                teamId,
                userId,
                ruleId: updatedRule.id,
                proposalId,
                type: 'RULE_UPDATED',
                description: `Updated rule "${updatedRule.name}" via proposal`,
              },
            });
            break;
          }

          case 'DELETE': {
            if (!proposal.ruleId) {
              throw new Error('Rule ID is required for DELETE proposal');
            }

            const deletedRule = await tx.rule.findUnique({
              where: { id: proposal.ruleId },
            });

            if (!deletedRule) {
              throw new Error('Target rule not found');
            }

            await tx.rule.delete({
              where: { id: proposal.ruleId },
            });

            // Create activity
            await tx.activity.create({
              data: {
                teamId,
                userId,
                proposalId,
                type: 'RULE_DELETED',
                description: `Deleted rule "${deletedRule.name}" via proposal`,
              },
            });
            break;
          }

          case 'DEPRECATE': {
            if (!proposal.ruleId) {
              throw new Error('Rule ID is required for DEPRECATE proposal');
            }

            const deprecatedRule = await tx.rule.update({
              where: { id: proposal.ruleId },
              data: {
                archivedAt: new Date(),
                metadata: {
                  deprecated: true,
                  deprecatedAt: new Date().toISOString(),
                  deprecatedBy: userId,
                  deprecatedReason: changes.reason as string | undefined,
                },
              },
            });

            ruleId = deprecatedRule.id;

            // Create activity
            await tx.activity.create({
              data: {
                teamId,
                userId,
                ruleId: deprecatedRule.id,
                proposalId,
                type: 'RULE_DEPRECATED',
                description: `Deprecated rule "${deprecatedRule.name}" via proposal`,
              },
            });
            break;
          }
        }

        // Update proposal status
        await tx.proposal.update({
          where: { id: proposalId },
          data: {
            status: 'MERGED',
            mergedAt: new Date(),
          },
        });

        // Award points to author
        await tx.teamMember.updateMany({
          where: {
            teamId,
            userId: proposal.authorId,
          },
          data: {
            points: { increment: 10 },
          },
        });

        // Award points to reviewers who approved
        const approvers = proposal.reviews
          .filter((r) => r.decision === 'APPROVED')
          .map((r) => r.reviewerId);

        if (approvers.length > 0) {
          await tx.teamMember.updateMany({
            where: {
              teamId,
              userId: { in: approvers },
            },
            data: {
              points: { increment: 2 },
            },
          });
        }
      });

      // Send notifications
      await notificationService.create({
        type: 'PROPOSAL_MERGED',
        userId: proposal.authorId,
        teamId,
        proposalId,
        ruleId,
        actorId: userId,
      });

      logger.info({ proposalId, ruleId }, 'Proposal merged successfully');

      return { success: true, ruleId };
    } catch (error) {
      logger.error({ error, proposalId }, 'Failed to merge proposal');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Merge failed',
      };
    }
  }

  /**
   * 버전 증가
   */
  private incrementVersion(version: string): string {
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
}

export const mergeService = new MergeService();
