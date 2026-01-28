'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  GitPullRequest,
  Users,
  TrendingUp,
  Activity,
  ArrowRight,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTeam, useTeamAnalyticsOverview, useProposals, useTeamRules } from '@/lib/api/hooks';
import { formatRelativeTime } from '@/lib/utils';

export default function TeamDashboardPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { data: analytics, isLoading: analyticsLoading } =
    useTeamAnalyticsOverview(teamId);
  const { data: proposalsData } = useProposals(teamId, { status: 'PENDING', limit: 5 });
  const { data: rulesData } = useTeamRules(teamId, { limit: 5 });

  if (teamLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!team) {
    return <div>Team not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{team.name}</h1>
        {team.description && (
          <p className="text-muted-foreground mt-1">{team.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                analytics?.totalRules || 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Proposals
            </CardTitle>
            <GitPullRequest className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                analytics?.pendingProposals || 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                analytics?.totalMembers || 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adoptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                analytics?.adoptions || 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Proposals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Proposals</CardTitle>
              <CardDescription>Proposals awaiting review</CardDescription>
            </div>
            <Link href={`/teams/${teamId}/proposals`}>
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {proposalsData?.proposals && proposalsData.proposals.length > 0 ? (
              <div className="space-y-4">
                {proposalsData.proposals.map((proposal) => (
                  <Link
                    key={proposal.id}
                    href={`/teams/${teamId}/proposals/${proposal.id}`}
                    className="flex items-center justify-between hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{proposal.title}</p>
                      <p className="text-sm text-muted-foreground">
                        by {proposal.author?.displayName}
                      </p>
                    </div>
                    <Badge variant="outline">{proposal.type}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No pending proposals
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Rules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Rules</CardTitle>
              <CardDescription>Recently updated rules</CardDescription>
            </div>
            <Link href={`/teams/${teamId}/rules`}>
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {rulesData?.rules && rulesData.rules.length > 0 ? (
              <div className="space-y-4">
                {rulesData.rules.map((rule) => (
                  <Link
                    key={rule.id}
                    href={`/teams/${teamId}/rules/${rule.ruleId}`}
                    className="flex items-center justify-between hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {rule.category}
                      </p>
                    </div>
                    <Badge
                      variant={
                        rule.severity === 'ERROR'
                          ? 'destructive'
                          : rule.severity === 'WARNING'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {rule.severity}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No rules yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
