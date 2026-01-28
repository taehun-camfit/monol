'use client';

import { useState } from 'react';
import {
  Code,
  Shield,
  Palette,
  GitBranch,
  Database,
  Globe,
  Zap,
  Book,
  FileText,
  Settings,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Category {
  name: string;
  count: number;
  icon?: string;
  subcategories?: Category[];
}

interface CategoryBrowserProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory: (category: string | null) => void;
  layout?: 'grid' | 'list';
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  code: <Code className="h-5 w-5" />,
  security: <Shield className="h-5 w-5" />,
  style: <Palette className="h-5 w-5" />,
  git: <GitBranch className="h-5 w-5" />,
  database: <Database className="h-5 w-5" />,
  api: <Globe className="h-5 w-5" />,
  performance: <Zap className="h-5 w-5" />,
  documentation: <Book className="h-5 w-5" />,
  testing: <FileText className="h-5 w-5" />,
  config: <Settings className="h-5 w-5" />,
  default: <LayoutGrid className="h-5 w-5" />,
};

function getCategoryIcon(category: string): React.ReactNode {
  const lowerCategory = category.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lowerCategory.includes(key)) {
      return icon;
    }
  }
  return CATEGORY_ICONS.default;
}

function getCategoryColor(category: string): string {
  const lowerCategory = category.toLowerCase();
  if (lowerCategory.includes('security')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (lowerCategory.includes('code')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (lowerCategory.includes('style')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  if (lowerCategory.includes('git')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  if (lowerCategory.includes('database')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (lowerCategory.includes('api')) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
  if (lowerCategory.includes('performance')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
}

export function CategoryBrowser({
  categories,
  selectedCategory,
  onSelectCategory,
  layout = 'grid',
}: CategoryBrowserProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleExpand = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            !selectedCategory && 'ring-2 ring-primary'
          )}
          onClick={() => onSelectCategory(null)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">All Categories</p>
              <p className="text-sm text-muted-foreground">
                {categories.reduce((sum, c) => sum + c.count, 0)} rules
              </p>
            </div>
          </CardContent>
        </Card>

        {categories.map((category) => (
          <Card
            key={category.name}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              selectedCategory === category.name && 'ring-2 ring-primary'
            )}
            onClick={() => onSelectCategory(category.name)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', getCategoryColor(category.name))}>
                {getCategoryIcon(category.name)}
              </div>
              <div>
                <p className="font-medium line-clamp-1">{category.name}</p>
                <p className="text-sm text-muted-foreground">
                  {category.count} rule{category.count !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // List layout
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Categories</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          <button
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors',
              !selectedCategory && 'bg-primary/5'
            )}
            onClick={() => onSelectCategory(null)}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded bg-primary/10 text-primary">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <span className="font-medium">All Categories</span>
            </div>
            <Badge variant="secondary">
              {categories.reduce((sum, c) => sum + c.count, 0)}
            </Badge>
          </button>

          {categories.map((category) => (
            <div key={category.name}>
              <button
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors',
                  selectedCategory === category.name && 'bg-primary/5'
                )}
                onClick={() => {
                  if (category.subcategories?.length) {
                    toggleExpand(category.name);
                  }
                  onSelectCategory(category.name);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-1.5 rounded', getCategoryColor(category.name))}>
                    {getCategoryIcon(category.name)}
                  </div>
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{category.count}</Badge>
                  {category.subcategories?.length && (
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        expandedCategories.has(category.name) && 'rotate-90'
                      )}
                    />
                  )}
                </div>
              </button>

              {category.subcategories && expandedCategories.has(category.name) && (
                <div className="bg-muted/30 border-l-2 border-primary/20 ml-4">
                  {category.subcategories.map((sub) => (
                    <button
                      key={sub.name}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors text-sm',
                        selectedCategory === sub.name && 'bg-primary/5'
                      )}
                      onClick={() => onSelectCategory(sub.name)}
                    >
                      <span>{sub.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {sub.count}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryBrowserSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-muted animate-pulse rounded-lg" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
