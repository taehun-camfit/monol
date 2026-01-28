'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Check,
  X,
  GitMerge,
  MessageSquare,
  AlertCircle,
  Clock,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  useProposal,
  useReviewProposal,
  useMergeProposal,
} from '@/lib/api/hooks';
import { formatRelativeTime } from '@/lib/utils';
import type { ProposalStatus, ReviewDecision } from '@/lib/api/types';

const statusConfig: Record<
  ProposalStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  PENDING: { label: 'Pending Review', variant: 'outline' },
  APPROVED: { label: 'Approved', variant: 'default' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  MERGED: { label: 'Merged', variant: 'default' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
};

const decisionConfig: Record<
  ReviewDecision,
  { label: string; icon: typeof Check; color: string }
> = {
  APPROVED: { label: 'Approved', icon: Check, color: 'text-green-600' },
  REJECTED: { label: 'Rejected', icon: X, color: 'text-red-600' },
  CHANGES_REQUESTED: {
    label: 'Changes Requested',
    icon: AlertCircle,
    color: 'text-yellow-600',
  },
};

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const teamId = params.teamId as string;
  const proposalId = params.proposalId as string;

  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: proposal, isLoading, refetch } = useProposal(teamId, proposalId);
  const reviewMutation = useReviewProposal(teamId);
  const mergeMutation = useMergeProposal(teamId);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleReview = async (decision: ReviewDecision) => {
    setIsSubmitting(true);
    try {
      await reviewMutation.mutateAsync({
        proposalId,
        decision,
        comment: reviewComment || undefined,
      });
      setReviewComment('');
      refetch();
      toast({
        title: 'Review submitted',
        description: `You ${decision.toLowerCase()} this proposal.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit review.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMerge = async () => {
    setIsSubmitting(true);
    try {
      await mergeMutation.mutateAsync(proposalId);
      refetch();
      toast({
        title: 'Proposal merged',
        description: 'The proposal has been merged successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to merge proposal.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!proposal) {
    return <div>Proposal not found</div>;
  }

  const isAuthor = session?.user?.id === proposal.author?.id;
  const canReview =
    proposal.status === 'PENDING' &&
    !isAuthor &&
    !proposal.reviews?.some((r) => r.reviewer.id === session?.user?.id);
  const canMerge = proposal.status === 'APPROVED' && (isAuthor || true); // TODO: check admin

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{proposal.title}</h1>
            <Badge
              variant={statusConfig[proposal.status as ProposalStatus]?.variant}
            >
              {statusConfig[proposal.status as ProposalStatus]?.label}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {proposal.author?.displayName} opened{' '}
            {formatRelativeTime(proposal.createdAt)}
          </p>
        </div>
        {canMerge && (
          <Button
            onClick={handleMerge}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <GitMerge className="h-4 w-4 mr-2" />
            Merge
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{proposal.description}</p>
            </CardContent>
          </Card>

          {/* Changes */}
          <Card>
            <CardHeader>
              <CardTitle>Proposed Changes</CardTitle>
              <CardDescription>Type: {proposal.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(proposal.changes, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
              <CardDescription>
                {proposal.currentApprovals}/{proposal.requiredApprovals}{' '}
                approvals required
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proposal.reviews && proposal.reviews.length > 0 ? (
                <div className="space-y-4">
                  {proposal.reviews.map((review) => {
                    const config =
                      decisionConfig[review.decision as ReviewDecision];
                    const Icon = config.icon;
                    return (
                      <div
                        key={review.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={review.reviewer.avatarUrl} />
                          <AvatarFallback>
                            {getInitials(review.reviewer.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {review.reviewer.displayName}
                            </span>
                            <span className={`flex items-center gap-1 ${config.color}`}>
                              <Icon className="h-4 w-4" />
                              {config.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(review.createdAt)}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-sm mt-1 text-muted-foreground">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No reviews yet
                </p>
              )}

              {/* Review Actions */}
              {canReview && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-3">Submit Your Review</h4>
                  <div className="space-y-3">
                    <Input
                      placeholder="Add a comment (optional)"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => handleReview('APPROVED')}
                        disabled={isSubmitting}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                        onClick={() => handleReview('CHANGES_REQUESTED')}
                        disabled={isSubmitting}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Request Changes
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleReview('REJECTED')}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proposal.comments && proposal.comments.length > 0 ? (
                <div className="space-y-4">
                  {proposal.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.avatarUrl} />
                        <AvatarFallback>
                          {getInitials(comment.author.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {comment.author.displayName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No comments yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Author */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Author</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={proposal.author?.avatarUrl} />
                  <AvatarFallback>
                    {proposal.author?.displayName
                      ? getInitials(proposal.author.displayName)
                      : '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{proposal.author?.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    @{proposal.author?.username}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Created {formatRelativeTime(proposal.createdAt)}</span>
                </div>
                {proposal.submittedAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>
                      Submitted {formatRelativeTime(proposal.submittedAt)}
                    </span>
                  </div>
                )}
                {proposal.mergedAt && (
                  <div className="flex items-center gap-2 text-green-600">
                    <GitMerge className="h-4 w-4" />
                    <span>Merged {formatRelativeTime(proposal.mergedAt)}</span>
                  </div>
                )}
                {proposal.closedAt && proposal.status === 'CANCELLED' && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span>
                      Cancelled {formatRelativeTime(proposal.closedAt)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rule */}
          {proposal.rule && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Related Rule</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{proposal.rule.name}</p>
                <code className="text-xs text-muted-foreground">
                  {proposal.rule.ruleId}
                </code>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
