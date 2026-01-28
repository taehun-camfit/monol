/**
 * GitHub Webhook Handler
 *
 * Processes incoming GitHub webhooks for PR synchronization,
 * push events, and other GitHub activities.
 */

import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../db.js';
import { GitHubClient } from './client.js';

export const githubWebhookRouter = Router();

/**
 * Verify GitHub webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * GitHub webhook event types
 */
type GitHubWebhookEvent =
  | 'push'
  | 'pull_request'
  | 'pull_request_review'
  | 'pull_request_review_comment'
  | 'issue_comment'
  | 'installation'
  | 'installation_repositories';

/**
 * Main webhook handler
 */
githubWebhookRouter.post(
  '/webhook',
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const event = req.headers['x-github-event'] as GitHubWebhookEvent;
    const deliveryId = req.headers['x-github-delivery'] as string;

    // Verify signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const rawBody = JSON.stringify(req.body);
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        logger.warn({ deliveryId }, 'Invalid webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    logger.info({ event, deliveryId }, 'Received GitHub webhook');

    try {
      // Route to appropriate handler
      switch (event) {
        case 'push':
          await handlePushEvent(req.body);
          break;
        case 'pull_request':
          await handlePullRequestEvent(req.body);
          break;
        case 'pull_request_review':
          await handlePullRequestReviewEvent(req.body);
          break;
        case 'pull_request_review_comment':
        case 'issue_comment':
          await handleCommentEvent(req.body);
          break;
        case 'installation':
          await handleInstallationEvent(req.body);
          break;
        case 'installation_repositories':
          await handleInstallationRepositoriesEvent(req.body);
          break;
        default:
          logger.info({ event }, 'Unhandled GitHub event');
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error({ error, event, deliveryId }, 'Webhook processing error');
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

/**
 * Handle push events (direct commits to rules)
 */
async function handlePushEvent(payload: {
  ref: string;
  repository: { id: number; full_name: string };
  commits: Array<{
    id: string;
    message: string;
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  sender: { id: number; login: string };
}): Promise<void> {
  const { repository, commits, ref } = payload;

  // Only process pushes to default branch
  if (!ref.endsWith('/main') && !ref.endsWith('/master')) {
    return;
  }

  // Find team associated with this repository
  const team = await prisma.team.findFirst({
    where: {
      githubRepoId: repository.id,
    },
  });

  if (!team) {
    logger.info({ repoId: repository.id }, 'No team found for repository');
    return;
  }

  // Check for rule file changes
  const ruleFiles = commits.flatMap((commit) => [
    ...commit.added.filter(isRuleFile),
    ...commit.modified.filter(isRuleFile),
    ...commit.removed.filter(isRuleFile),
  ]);

  if (ruleFiles.length === 0) {
    return;
  }

  logger.info(
    { teamId: team.id, ruleFiles },
    'Processing rule file changes from push'
  );

  // Queue sync job to update rules from repository
  // In production, use a job queue like Bull
  await syncRulesFromRepository(team.id, repository.full_name);
}

/**
 * Handle pull request events
 */
async function handlePullRequestEvent(payload: {
  action: string;
  number: number;
  pull_request: {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: string;
    merged: boolean;
    head: { sha: string; ref: string };
    base: { ref: string };
    user: { id: number; login: string };
  };
  repository: { id: number; full_name: string };
}): Promise<void> {
  const { action, pull_request: pr, repository } = payload;

  // Find team associated with this repository
  const team = await prisma.team.findFirst({
    where: {
      githubRepoId: repository.id,
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!team) return;

  switch (action) {
    case 'opened':
    case 'reopened':
      await handlePullRequestOpened(team.id, pr, repository.full_name);
      break;
    case 'synchronize':
      await handlePullRequestUpdated(team.id, pr);
      break;
    case 'closed':
      if (pr.merged) {
        await handlePullRequestMerged(team.id, pr);
      } else {
        await handlePullRequestClosed(team.id, pr);
      }
      break;
  }
}

/**
 * Handle pull request opened - create linked proposal
 */
async function handlePullRequestOpened(
  teamId: string,
  pr: {
    id: number;
    number: number;
    title: string;
    body: string | null;
    user: { id: number; login: string };
  },
  repoFullName: string
): Promise<void> {
  // Check if PR contains rule file changes
  // This would require an API call to get the PR files
  // For now, we'll create a proposal for all rule-related PRs

  // Find user by GitHub ID
  const user = await prisma.user.findFirst({
    where: {
      githubId: pr.user.id,
    },
  });

  if (!user) {
    logger.info(
      { githubUserId: pr.user.id },
      'User not found for PR author'
    );
    return;
  }

  // Create linked proposal
  await prisma.proposal.create({
    data: {
      title: pr.title,
      description: pr.body || '',
      type: 'UPDATE', // Default to UPDATE
      status: 'PENDING',
      authorId: user.id,
      teamId,
      githubPrNumber: pr.number,
      githubPrId: pr.id,
      githubRepo: repoFullName,
    },
  });

  logger.info(
    { teamId, prNumber: pr.number },
    'Created proposal linked to PR'
  );
}

/**
 * Handle pull request updated
 */
async function handlePullRequestUpdated(
  teamId: string,
  pr: { number: number; head: { sha: string } }
): Promise<void> {
  // Update linked proposal
  await prisma.proposal.updateMany({
    where: {
      teamId,
      githubPrNumber: pr.number,
      status: { not: 'MERGED' },
    },
    data: {
      updatedAt: new Date(),
    },
  });
}

/**
 * Handle pull request merged
 */
async function handlePullRequestMerged(
  teamId: string,
  pr: { number: number }
): Promise<void> {
  // Update linked proposal to merged
  await prisma.proposal.updateMany({
    where: {
      teamId,
      githubPrNumber: pr.number,
    },
    data: {
      status: 'MERGED',
      mergedAt: new Date(),
    },
  });

  logger.info({ teamId, prNumber: pr.number }, 'PR merged, proposal updated');
}

/**
 * Handle pull request closed (not merged)
 */
async function handlePullRequestClosed(
  teamId: string,
  pr: { number: number }
): Promise<void> {
  // Update linked proposal to cancelled
  await prisma.proposal.updateMany({
    where: {
      teamId,
      githubPrNumber: pr.number,
      status: { notIn: ['MERGED', 'REJECTED'] },
    },
    data: {
      status: 'CANCELLED',
    },
  });
}

/**
 * Handle pull request review events
 */
async function handlePullRequestReviewEvent(payload: {
  action: string;
  review: {
    id: number;
    state: 'approved' | 'changes_requested' | 'commented';
    body: string | null;
    user: { id: number; login: string };
  };
  pull_request: { number: number };
  repository: { id: number };
}): Promise<void> {
  const { action, review, pull_request: pr, repository } = payload;

  if (action !== 'submitted') return;

  // Find team and proposal
  const team = await prisma.team.findFirst({
    where: { githubRepoId: repository.id },
  });

  if (!team) return;

  const proposal = await prisma.proposal.findFirst({
    where: {
      teamId: team.id,
      githubPrNumber: pr.number,
    },
  });

  if (!proposal) return;

  // Find reviewer user
  const reviewer = await prisma.user.findFirst({
    where: { githubId: review.user.id },
  });

  if (!reviewer) return;

  // Create review record
  await prisma.review.create({
    data: {
      proposalId: proposal.id,
      reviewerId: reviewer.id,
      status: mapGitHubReviewState(review.state),
      comment: review.body,
      githubReviewId: review.id,
    },
  });

  logger.info(
    { proposalId: proposal.id, reviewState: review.state },
    'Synced GitHub review to proposal'
  );
}

/**
 * Handle comment events
 */
async function handleCommentEvent(payload: {
  action: string;
  comment: {
    id: number;
    body: string;
    user: { id: number; login: string };
  };
  issue?: { number: number };
  pull_request?: { number: number };
  repository: { id: number };
}): Promise<void> {
  const { action, comment, issue, pull_request, repository } = payload;

  if (action !== 'created') return;

  const prNumber = pull_request?.number || issue?.number;
  if (!prNumber) return;

  // Find team and proposal
  const team = await prisma.team.findFirst({
    where: { githubRepoId: repository.id },
  });

  if (!team) return;

  const proposal = await prisma.proposal.findFirst({
    where: {
      teamId: team.id,
      githubPrNumber: prNumber,
    },
  });

  if (!proposal) return;

  // Find comment author
  const author = await prisma.user.findFirst({
    where: { githubId: comment.user.id },
  });

  if (!author) return;

  // Create comment record
  await prisma.comment.create({
    data: {
      proposalId: proposal.id,
      authorId: author.id,
      content: comment.body,
      githubCommentId: comment.id,
    },
  });
}

/**
 * Handle GitHub App installation events
 */
async function handleInstallationEvent(payload: {
  action: 'created' | 'deleted' | 'suspend' | 'unsuspend';
  installation: {
    id: number;
    account: { id: number; login: string };
  };
  repositories?: Array<{ id: number; name: string; full_name: string }>;
}): Promise<void> {
  const { action, installation, repositories } = payload;

  logger.info(
    { action, installationId: installation.id },
    'GitHub App installation event'
  );

  // Store or remove installation record
  switch (action) {
    case 'created':
      await prisma.githubInstallation.create({
        data: {
          installationId: installation.id,
          accountId: installation.account.id,
          accountLogin: installation.account.login,
          repositories: repositories?.map((r) => r.full_name) || [],
        },
      });
      break;
    case 'deleted':
      await prisma.githubInstallation.delete({
        where: { installationId: installation.id },
      });
      break;
  }
}

/**
 * Handle installation repositories events
 */
async function handleInstallationRepositoriesEvent(payload: {
  action: 'added' | 'removed';
  installation: { id: number };
  repositories_added?: Array<{ id: number; full_name: string }>;
  repositories_removed?: Array<{ id: number; full_name: string }>;
}): Promise<void> {
  const {
    action,
    installation,
    repositories_added,
    repositories_removed,
  } = payload;

  const existing = await prisma.githubInstallation.findUnique({
    where: { installationId: installation.id },
  });

  if (!existing) return;

  let repositories = existing.repositories as string[];

  if (action === 'added' && repositories_added) {
    repositories = [
      ...repositories,
      ...repositories_added.map((r) => r.full_name),
    ];
  } else if (action === 'removed' && repositories_removed) {
    const removedSet = new Set(repositories_removed.map((r) => r.full_name));
    repositories = repositories.filter((r) => !removedSet.has(r));
  }

  await prisma.githubInstallation.update({
    where: { installationId: installation.id },
    data: { repositories },
  });
}

// ================================================================
// Helper functions
// ================================================================

function isRuleFile(path: string): boolean {
  return (
    path.startsWith('rules/') &&
    (path.endsWith('.yaml') || path.endsWith('.yml'))
  );
}

function mapGitHubReviewState(
  state: 'approved' | 'changes_requested' | 'commented'
): 'APPROVED' | 'REQUEST_CHANGES' | 'COMMENTED' {
  switch (state) {
    case 'approved':
      return 'APPROVED';
    case 'changes_requested':
      return 'REQUEST_CHANGES';
    default:
      return 'COMMENTED';
  }
}

async function syncRulesFromRepository(
  teamId: string,
  repoFullName: string
): Promise<void> {
  // Implementation would fetch rules from the repository
  // and update the team's rules accordingly
  logger.info({ teamId, repoFullName }, 'Syncing rules from repository');
  // TODO: Implement full sync logic
}

export default githubWebhookRouter;
