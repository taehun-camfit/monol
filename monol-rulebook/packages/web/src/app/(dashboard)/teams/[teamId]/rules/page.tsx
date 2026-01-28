'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamRules } from '@/lib/api/hooks';
import { formatRelativeTime } from '@/lib/utils';

export default function RulesPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>();

  const { data, isLoading } = useTeamRules(teamId, { category });

  const filteredRules = data?.rules?.filter((rule) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      rule.name.toLowerCase().includes(searchLower) ||
      rule.description?.toLowerCase().includes(searchLower) ||
      rule.ruleId.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rules</h1>
          <p className="text-muted-foreground">
            Manage your team&apos;s coding rules and guidelines
          </p>
        </div>
        <Link href={`/teams/${teamId}/rules/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Rules List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRules && filteredRules.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRules.map((rule) => (
            <Link key={rule.id} href={`/teams/${teamId}/rules/${rule.ruleId}`}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <code className="text-xs text-muted-foreground">
                        {rule.ruleId}
                      </code>
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
                  </div>
                  <CardDescription className="line-clamp-2">
                    {rule.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{rule.category}</span>
                    <span>v{rule.version}</span>
                  </div>
                  {rule.tags && rule.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rule.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {rule.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{rule.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {search ? 'No rules match your search' : 'No rules yet'}
            </p>
            {!search && (
              <Link href={`/teams/${teamId}/rules/new`}>
                <Button>Create Your First Rule</Button>
              </Link>
            )}
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
