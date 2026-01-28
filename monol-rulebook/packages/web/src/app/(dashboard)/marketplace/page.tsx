'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Star, Download, TrendingUp } from 'lucide-react';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useMarketplaceRules,
  useTrendingRules,
  useMarketplaceCategories,
} from '@/lib/api/hooks';

export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>();

  const { data: rulesData, isLoading: rulesLoading } = useMarketplaceRules({
    q: search || undefined,
    category,
  });
  const { data: trendingData, isLoading: trendingLoading } = useTrendingRules();
  const { data: categoriesData } = useMarketplaceCategories();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold">Rule Marketplace</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Discover and adopt coding rules from the community
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* Categories */}
      {categoriesData?.categories && categoriesData.categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant={category === undefined ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(undefined)}
          >
            All
          </Button>
          {categoriesData.categories.slice(0, 8).map((cat) => (
            <Button
              key={cat.name}
              variant={category === cat.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(cat.name)}
            >
              {cat.name} ({cat.count})
            </Button>
          ))}
        </div>
      )}

      {/* Trending Section */}
      {!search && !category && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Trending Rules</h2>
          </div>
          {trendingLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : trendingData?.rules && trendingData.rules.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trendingData.rules.slice(0, 6).map((rule) => (
                <Link key={rule.id} href={`/marketplace/${rule.ruleId}`}>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
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
                        <div className="flex items-center gap-3">
                          {rule.rating !== undefined && (
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              {rule.rating.toFixed(1)}
                            </span>
                          )}
                          {rule.downloads !== undefined && (
                            <span className="flex items-center gap-1">
                              <Download className="h-4 w-4" />
                              {rule.downloads}
                            </span>
                          )}
                        </div>
                        {rule.author && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={rule.author.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {getInitials(rule.author.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">
                              {rule.author.displayName}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* All Rules */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {search
            ? `Search results for "${search}"`
            : category
            ? `${category} Rules`
            : 'All Rules'}
        </h2>
        {rulesLoading ? (
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
        ) : rulesData?.rules && rulesData.rules.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rulesData.rules.map((rule) => (
              <Link key={rule.id} href={`/marketplace/${rule.ruleId}`}>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
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
                      <div className="flex items-center gap-3">
                        {rule.rating !== undefined && (
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {rule.rating.toFixed(1)}
                          </span>
                        )}
                        {rule.downloads !== undefined && (
                          <span className="flex items-center gap-1">
                            <Download className="h-4 w-4" />
                            {rule.downloads}
                          </span>
                        )}
                      </div>
                    </div>
                    {rule.tags && rule.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {rule.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
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
              <p className="text-muted-foreground">
                {search
                  ? 'No rules match your search'
                  : 'No rules available yet'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {rulesData?.pagination &&
        rulesData.pagination.total > rulesData.pagination.limit && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page 1 of{' '}
              {Math.ceil(
                rulesData.pagination.total / rulesData.pagination.limit
              )}
            </span>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        )}
    </div>
  );
}
