'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';

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
import { useProposals } from '@/lib/api/hooks';
import { formatRelativeTime } from '@/lib/utils';
import type { ProposalStatus, ProposalType } from '@/lib/api/types';

const statusColors: Record<ProposalStatus, string> = {
  DRAFT: 'secondary',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  MERGED: 'info',
  CANCELLED: 'secondary',
};

const typeLabels: Record<ProposalType, string> = {
  CREATE: 'New Rule',
  UPDATE: 'Update',
  DELETE: 'Delete',
  DEPRECATE: 'Deprecate',
};

export default function ProposalsPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data, isLoading } = useProposals(teamId, { status: statusFilter });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proposals</h1>
          <p className="text-muted-foreground">
            Review and manage rule change proposals
          </p>
        </div>
        <Link href={`/teams/${teamId}/proposals/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === undefined ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter(undefined)}
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending
        </Button>
        <Button
          variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('APPROVED')}
        >
          Approved
        </Button>
        <Button
          variant={statusFilter === 'MERGED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('MERGED')}
        >
          Merged
        </Button>
        <Button
          variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('REJECTED')}
        >
          Rejected
        </Button>
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : data?.proposals && data.proposals.length > 0 ? (
        <div className="space-y-4">
          {data.proposals.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/teams/${teamId}/proposals/${proposal.id}`}
            >
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={proposal.author?.avatarUrl} />
                        <AvatarFallback>
                          {proposal.author?.displayName
                            ? getInitials(proposal.author.displayName)
                            : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {proposal.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {proposal.author?.displayName} opened{' '}
                          {formatRelativeTime(proposal.createdAt)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {typeLabels[proposal.type as ProposalType]}
                      </Badge>
                      <Badge
                        variant={
                          statusColors[
                            proposal.status as ProposalStatus
                          ] as 'default'
                        }
                      >
                        {proposal.status}
                      </Badge>
                    </div>
                  </div>
                  {proposal.rule && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Rule: <code>{proposal.rule.ruleId}</code> -{' '}
                      {proposal.rule.name}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {proposal.currentApprovals}/{proposal.requiredApprovals}{' '}
                      approvals
                    </span>
                    {proposal._count?.comments !== undefined &&
                      proposal._count.comments > 0 && (
                        <span>{proposal._count.comments} comments</span>
                      )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} proposals`
                : 'No proposals yet'}
            </p>
            <Link href={`/teams/${teamId}/proposals/new`}>
              <Button>Create Your First Proposal</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.total > data.pagination.limit && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page 1 of {Math.ceil(data.pagination.total / data.pagination.limit)}
          </span>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
