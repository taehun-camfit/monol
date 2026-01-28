'use client';

import { useParams } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  GitPullRequest,
} from 'lucide-react';

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
import {
  useTeamAnalyticsOverview,
  useRuleAnalytics,
  useProposalAnalytics,
  useMemberAnalytics,
} from '@/lib/api/hooks';

export default function AnalyticsPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  const { data: overview, isLoading: overviewLoading } =
    useTeamAnalyticsOverview(teamId);
  const { data: ruleAnalytics, isLoading: rulesLoading } =
    useRuleAnalytics(teamId);
  const { data: proposalAnalytics, isLoading: proposalsLoading } =
    useProposalAnalytics(teamId);
  const { data: memberAnalytics, isLoading: membersLoading } =
    useMemberAnalytics(teamId);

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
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Track your team&apos;s progress and activity
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{overview?.totalRules}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Proposals
            </CardTitle>
            <GitPullRequest className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {overview?.totalProposals}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{overview?.totalMembers}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {overview?.recentActivity}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Rules by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Rules by Category</CardTitle>
            <CardDescription>Distribution of rules across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {rulesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : ruleAnalytics?.byCategory &&
              ruleAnalytics.byCategory.length > 0 ? (
              <div className="space-y-3">
                {ruleAnalytics.byCategory.map((item) => (
                  <div key={item.category} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.category}</span>
                        <span className="text-muted-foreground">
                          {item.count}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{
                            width: `${
                              (item.count /
                                Math.max(
                                  ...ruleAnalytics.byCategory.map(
                                    (c) => c.count
                                  )
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Rules by Severity */}
        <Card>
          <CardHeader>
            <CardTitle>Rules by Severity</CardTitle>
            <CardDescription>Breakdown by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            {rulesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : ruleAnalytics?.bySeverity &&
              ruleAnalytics.bySeverity.length > 0 ? (
              <div className="space-y-3">
                {ruleAnalytics.bySeverity.map((item) => (
                  <div key={item.severity} className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.severity === 'ERROR'
                          ? 'destructive'
                          : item.severity === 'WARNING'
                          ? 'warning'
                          : 'secondary'
                      }
                      className="w-20 justify-center"
                    >
                      {item.severity}
                    </Badge>
                    <div className="flex-1">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full ${
                            item.severity === 'ERROR'
                              ? 'bg-destructive'
                              : item.severity === 'WARNING'
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${
                              (item.count /
                                Math.max(
                                  ...ruleAnalytics.bySeverity.map(
                                    (s) => s.count
                                  )
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contributors */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Contributors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Contributors</CardTitle>
            <CardDescription>Most active proposal authors</CardDescription>
          </CardHeader>
          <CardContent>
            {proposalsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : proposalAnalytics?.topContributors &&
              proposalAnalytics.topContributors.length > 0 ? (
              <div className="space-y-3">
                {proposalAnalytics.topContributors.map((item, index) => (
                  <div
                    key={item.user?.id || index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={item.user?.avatarUrl} />
                        <AvatarFallback>
                          {item.user?.displayName
                            ? getInitials(item.user.displayName)
                            : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {item.user?.displayName || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {item.proposalCount} proposals
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Points Leaderboard</CardTitle>
            <CardDescription>Members ranked by contribution points</CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : (memberAnalytics as any)?.leaderboard &&
              (memberAnalytics as any).leaderboard.length > 0 ? (
              <div className="space-y-3">
                {(memberAnalytics as any).leaderboard.map(
                  (item: any, index: number) => (
                    <div
                      key={item.user?.id || index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={item.user?.avatarUrl} />
                          <AvatarFallback>
                            {item.user?.displayName
                              ? getInitials(item.user.displayName)
                              : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {item.user?.displayName || 'Unknown'}
                        </span>
                      </div>
                      <span className="font-semibold">{item.points} pts</span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Proposal Stats */}
      {proposalAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle>Proposal Statistics</CardTitle>
            <CardDescription>Overview of proposal workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {proposalAnalytics.avgTimeToMergeHours.toFixed(1)}h
                </p>
                <p className="text-sm text-muted-foreground">
                  Avg. time to merge
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {proposalAnalytics.byStatus.find((s) => s.status === 'MERGED')
                    ?.count || 0}
                </p>
                <p className="text-sm text-muted-foreground">Merged proposals</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {proposalAnalytics.byStatus.find(
                    (s) => s.status === 'PENDING'
                  )?.count || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Pending proposals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
