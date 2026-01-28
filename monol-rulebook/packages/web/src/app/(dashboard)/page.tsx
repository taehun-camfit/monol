'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { BookOpen, Plus, Users, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTeams } from '@/lib/api/hooks';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { data: session } = useSession();
  const { data: teamsData, isLoading } = useTeams();

  if (!session) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center">
        <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold mb-2">Welcome to Monol Rulebook</h1>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Collaborate on coding rules and guidelines with your team. Share best
          practices and maintain consistency across your projects.
        </p>
        <div className="flex gap-4">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="outline" size="lg">
              Browse Marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {session.user.displayName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your teams and recent activity
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/teams/new">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Create Team</CardTitle>
                <CardDescription>Start a new team</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/marketplace">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Marketplace</CardTitle>
                <CardDescription>Browse shared rules</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/profile">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">My Profile</CardTitle>
                <CardDescription>View your contributions</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Teams List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Teams</h2>
          <Link href="/teams/new">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Team
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : teamsData?.teams && teamsData.teams.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teamsData.teams.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardDescription>
                      {team.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{team.memberCount} members</span>
                      <span>{team.ruleCount} rules</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                You haven&apos;t joined any teams yet
              </p>
              <Link href="/teams/new">
                <Button>Create Your First Team</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
