'use client';

import Link from 'next/link';
import { Star, Download, Heart, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RuleCardProps {
  rule: {
    id: string;
    ruleId: string;
    name: string;
    description?: string | null;
    category: string;
    tags: string[];
    rating: number;
    downloads: number;
    author?: {
      id: string;
      username?: string | null;
      displayName?: string | null;
      avatarUrl?: string | null;
    } | null;
    team?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
  onFavorite?: (ruleId: string) => void;
  isFavorited?: boolean;
  showActions?: boolean;
}

export function RuleCard({
  rule,
  onFavorite,
  isFavorited = false,
  showActions = true,
}: RuleCardProps) {
  const authorName = rule.author?.displayName || rule.author?.username || 'Unknown';
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link
              href={`/marketplace/${rule.id}`}
              className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1"
            >
              {rule.name}
            </Link>
            <p className="text-sm text-muted-foreground font-mono">{rule.ruleId}</p>
          </div>
          {showActions && onFavorite && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onFavorite(rule.id)}
              className={isFavorited ? 'text-red-500' : ''}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {rule.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {rule.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="secondary" className="text-xs">
            {rule.category}
          </Badge>
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

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span>{rule.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>{rule.downloads.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={rule.author?.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <span className="text-muted-foreground">by </span>
              <span className="font-medium">{authorName}</span>
              {rule.team && (
                <>
                  <span className="text-muted-foreground"> / </span>
                  <Link
                    href={`/teams/${rule.team.slug}`}
                    className="text-primary hover:underline"
                  >
                    {rule.team.name}
                  </Link>
                </>
              )}
            </div>
          </div>
          <Link href={`/marketplace/${rule.id}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              View
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

export function RuleCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded mt-1" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="h-10 bg-muted animate-pulse rounded mb-3" />
        <div className="flex gap-1 mb-3">
          <div className="h-5 w-20 bg-muted animate-pulse rounded" />
          <div className="h-5 w-16 bg-muted animate-pulse rounded" />
          <div className="h-5 w-16 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex gap-4">
          <div className="h-4 w-12 bg-muted animate-pulse rounded" />
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-muted animate-pulse rounded-full" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        </div>
      </CardFooter>
    </Card>
  );
}
