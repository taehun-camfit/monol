'use client';

import Link from 'next/link';
import { TrendingUp, Flame, Star, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TrendingRule {
  id: string;
  ruleId: string;
  name: string;
  description?: string | null;
  category: string;
  rating: number;
  downloads: number;
  trendingScore?: {
    score: number;
    downloads: number;
    views: number;
    adoptions: number;
  };
  author?: {
    id: string;
    displayName?: string | null;
    username?: string | null;
  } | null;
}

interface TrendingSectionProps {
  rules: TrendingRule[];
  title?: string;
  showViewAll?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export function TrendingSection({
  rules,
  title = 'Trending Rules',
  showViewAll = true,
  variant = 'default',
}: TrendingSectionProps) {
  if (rules.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              {title}
            </CardTitle>
            {showViewAll && (
              <Link href="/marketplace?sort=trending">
                <Button variant="ghost" size="sm" className="gap-1">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.slice(0, 5).map((rule, index) => (
              <Link
                key={rule.id}
                href={`/marketplace/${rule.id}`}
                className="flex items-center gap-3 group"
              >
                <span
                  className={cn(
                    'text-lg font-bold w-6 text-center',
                    index === 0 && 'text-yellow-500',
                    index === 1 && 'text-gray-400',
                    index === 2 && 'text-orange-400',
                    index > 2 && 'text-muted-foreground'
                  )}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                    {rule.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      {rule.rating.toFixed(1)}
                    </span>
                    <span>{rule.downloads.toLocaleString()} downloads</span>
                  </div>
                </div>
                {index < 3 && <Flame className="h-4 w-4 text-orange-500" />}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'featured') {
    const featured = rules[0];
    const rest = rules.slice(1, 5);

    return (
      <div className="grid md:grid-cols-2 gap-4">
        {/* Featured Rule */}
        <Link href={`/marketplace/${featured.id}`}>
          <Card className="h-full group hover:shadow-lg transition-all border-2 border-orange-200 dark:border-orange-900/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <Badge variant="outline" className="text-xs mb-2 text-orange-600 border-orange-300">
                    #1 Trending
                  </Badge>
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {featured.name}
                  </h3>
                </div>
              </div>

              {featured.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {featured.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm">
                <Badge variant="secondary">{featured.category}</Badge>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  {featured.rating.toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  {featured.downloads.toLocaleString()} downloads
                </span>
              </div>

              {featured.trendingScore && (
                <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    <TrendingUp className="h-3 w-3 inline mr-1 text-green-500" />
                    Trending score: {featured.trendingScore.score.toFixed(2)}
                  </span>
                  {featured.trendingScore.views > 0 && (
                    <span>{featured.trendingScore.views} views this week</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Other Trending Rules */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Also Trending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rest.map((rule, index) => (
                <Link
                  key={rule.id}
                  href={`/marketplace/${rule.id}`}
                  className="flex items-start gap-3 group"
                >
                  <span
                    className={cn(
                      'text-lg font-bold w-6 text-center mt-0.5',
                      index === 0 && 'text-gray-400',
                      index === 1 && 'text-orange-400',
                      index > 1 && 'text-muted-foreground'
                    )}
                  >
                    {index + 2}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {rule.name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {rule.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs py-0">
                        {rule.category}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {rule.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default variant
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            {title}
          </CardTitle>
          {showViewAll && (
            <Link href="/marketplace?sort=trending">
              <Button variant="outline" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rules.slice(0, 8).map((rule, index) => (
            <Link
              key={rule.id}
              href={`/marketplace/${rule.id}`}
              className="group p-4 rounded-lg border hover:shadow-md transition-all hover:border-primary/50"
            >
              <div className="flex items-center gap-2 mb-2">
                {index < 3 && (
                  <span
                    className={cn(
                      'text-xs font-bold px-1.5 py-0.5 rounded',
                      index === 0 && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                      index === 1 && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                      index === 2 && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    )}
                  >
                    #{index + 1}
                  </span>
                )}
                <Badge variant="outline" className="text-xs">
                  {rule.category.split('/').pop()}
                </Badge>
              </div>

              <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                {rule.name}
              </h4>

              {rule.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {rule.description}
                </p>
              )}

              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  {rule.rating.toFixed(1)}
                </span>
                <span>{rule.downloads.toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TrendingSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-8 bg-muted animate-pulse rounded" />
                <div className="h-5 w-16 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-4 w-full bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 w-full bg-muted animate-pulse rounded mb-3" />
              <div className="flex gap-3">
                <div className="h-3 w-10 bg-muted animate-pulse rounded" />
                <div className="h-3 w-12 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
