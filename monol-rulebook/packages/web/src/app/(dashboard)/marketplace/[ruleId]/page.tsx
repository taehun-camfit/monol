'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Download,
  Heart,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Tag,
  Users,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { ReviewList, ReviewForm } from '@/components/marketplace/review-system';
import { RuleCard } from '@/components/marketplace/rule-card';

// Mock data - replace with actual API calls
const mockRule = {
  id: '1',
  ruleId: 'naming-001',
  name: 'Variable Naming Convention',
  description:
    'A comprehensive rule for naming variables, functions, and classes consistently across your codebase. Enforces camelCase for variables and functions, PascalCase for classes, and SCREAMING_SNAKE_CASE for constants.',
  category: 'code/naming',
  tags: ['naming', 'style', 'variables', 'functions', 'classes'],
  rating: 4.5,
  downloads: 1234,
  severity: 'warning',
  content: `# Variable Naming Convention

## Rules

1. **Variables and Functions**: Use camelCase
2. **Classes and Types**: Use PascalCase
3. **Constants**: Use SCREAMING_SNAKE_CASE
4. **File names**: Use kebab-case

## Examples

### Good
\`\`\`typescript
const userName = 'kent';
function getUserById(id: string) { }
class UserService { }
const MAX_RETRY_COUNT = 3;
\`\`\`

### Bad
\`\`\`typescript
const user_name = 'kent';
function GetUserById(id) { }
class user_service { }
const maxRetryCount = 3;
\`\`\`
`,
  author: {
    id: '1',
    username: 'kentdev',
    displayName: 'Kent Developer',
    avatarUrl: null,
  },
  team: {
    id: '1',
    name: 'Frontend Team',
    slug: 'frontend-team',
  },
  publishedAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-20T15:30:00Z',
  version: '1.2.0',
  _count: {
    adoptions: 456,
    reviews: 89,
  },
};

const mockReviews = [
  {
    id: '1',
    rating: 5,
    title: 'Great rule for code consistency',
    content:
      'This rule has significantly improved our code consistency across the team. The examples are clear and the edge cases are well documented.',
    pros: ['Clear documentation', 'Good examples', 'Covers all cases'],
    cons: [],
    verified: true,
    helpfulCount: 23,
    createdAt: '2024-01-18T12:00:00Z',
    editedAt: null,
    author: {
      id: '2',
      username: 'janedev',
      displayName: 'Jane Developer',
      avatarUrl: null,
    },
  },
  {
    id: '2',
    rating: 4,
    title: 'Very useful with minor issues',
    content:
      'Overall a great rule. Would love to see more configuration options for specific edge cases like external API responses.',
    pros: ['Easy to adopt', 'Well maintained'],
    cons: ['Limited configuration'],
    verified: true,
    helpfulCount: 12,
    createdAt: '2024-01-16T09:00:00Z',
    editedAt: null,
    author: {
      id: '3',
      username: 'bobcoder',
      displayName: 'Bob Coder',
      avatarUrl: null,
    },
  },
];

const mockSimilarRules = [
  {
    id: '2',
    ruleId: 'style-format-001',
    name: 'Code Formatting Standards',
    description: 'Consistent code formatting with Prettier integration',
    category: 'code/style',
    tags: ['formatting', 'prettier', 'style'],
    rating: 4.3,
    downloads: 987,
    author: { id: '1', username: 'kentdev', displayName: 'Kent Developer', avatarUrl: null },
    team: { id: '1', name: 'Frontend Team', slug: 'frontend-team' },
  },
  {
    id: '3',
    ruleId: 'naming-function-001',
    name: 'Function Naming Guidelines',
    description: 'Best practices for naming functions and methods',
    category: 'code/naming',
    tags: ['naming', 'functions', 'methods'],
    rating: 4.7,
    downloads: 654,
    author: { id: '2', username: 'janedev', displayName: 'Jane Developer', avatarUrl: null },
    team: null,
  },
];

export default function MarketplaceRuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isFavorited, setIsFavorited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAdopting, setIsAdopting] = useState(false);
  const [helpfulMarked, setHelpfulMarked] = useState<Set<string>>(new Set());

  // TODO: Replace with actual API calls
  const rule = mockRule;
  const reviews = mockReviews;
  const similarRules = mockSimilarRules;
  const isLoading = false;

  const reviewStats = {
    averageRating: rule.rating,
    totalReviews: rule._count.reviews,
    ratingDistribution: { 5: 45, 4: 30, 3: 10, 2: 3, 1: 1 },
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast({
      title: isFavorited ? 'Removed from favorites' : 'Added to favorites',
    });
  };

  const handleCopyRuleId = () => {
    navigator.clipboard.writeText(rule.ruleId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link copied to clipboard' });
  };

  const handleAdopt = async () => {
    setIsAdopting(true);
    // TODO: Implement actual adoption logic
    setTimeout(() => {
      setIsAdopting(false);
      toast({
        title: 'Rule adopted successfully',
        description: 'The rule has been added to your team.',
      });
    }, 1000);
  };

  const handleHelpful = (reviewId: string) => {
    setHelpfulMarked((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  const handleReviewSubmit = (data: {
    rating: number;
    title?: string;
    content: string;
    pros?: string[];
    cons?: string[];
  }) => {
    console.log('Review submitted:', data);
    toast({ title: 'Review submitted successfully' });
  };

  if (isLoading) {
    return <MarketplaceRuleDetailSkeleton />;
  }

  const authorName = rule.author.displayName || rule.author.username || 'Unknown';
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Back Navigation */}
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rule Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{rule.name}</h1>
                  <div className="flex items-center gap-2 mb-4">
                    <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                      {rule.ruleId}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCopyRuleId}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Badge
                      variant={
                        rule.severity === 'error'
                          ? 'destructive'
                          : rule.severity === 'warning'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {rule.severity}
                    </Badge>
                    <Badge variant="outline">v{rule.version}</Badge>
                  </div>
                  <p className="text-muted-foreground">{rule.description}</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handleFavorite}>
                    <Heart
                      className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{rule.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({rule._count.reviews} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{rule.downloads.toLocaleString()}</span>
                  <span className="text-muted-foreground">downloads</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{rule._count.adoptions}</span>
                  <span className="text-muted-foreground">teams using</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary">{rule.category}</Badge>
                {rule.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Adopt Button */}
              <div className="mt-6">
                <Button size="lg" className="w-full sm:w-auto" onClick={handleAdopt} disabled={isAdopting}>
                  {isAdopting ? 'Adopting...' : 'Adopt This Rule'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rule Content */}
          <Card>
            <CardHeader>
              <CardTitle>Rule Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                  {rule.content}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <div className="space-y-6">
            <ReviewForm onSubmit={handleReviewSubmit} />
            <ReviewList
              reviews={reviews}
              stats={reviewStats}
              onHelpful={handleHelpful}
              helpfulMarked={helpfulMarked}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Author Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Published by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={rule.author.avatarUrl || undefined} />
                  <AvatarFallback>{authorInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{authorName}</p>
                  {rule.team && (
                    <Link
                      href={`/teams/${rule.team.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {rule.team.name}
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Published
                </span>
                <span>{new Date(rule.publishedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last updated
                </span>
                <span>{new Date(rule.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <Badge variant="outline">{rule.version}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span>{rule.category}</span>
              </div>
            </CardContent>
          </Card>

          {/* Similar Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Similar Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {similarRules.map((similar) => (
                <Link
                  key={similar.id}
                  href={`/marketplace/${similar.id}`}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <p className="font-medium text-sm line-clamp-1">{similar.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {similar.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      {similar.rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {similar.downloads}
                    </span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MarketplaceRuleDetailSkeleton() {
  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <Skeleton className="h-10 w-40 mb-4" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
