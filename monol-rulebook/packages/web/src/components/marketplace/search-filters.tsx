'use client';

import { useState } from 'react';
import { X, SlidersHorizontal, Star, Download, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  filters: {
    query?: string;
    category?: string;
    tags?: string[];
    minRating?: number;
    minDownloads?: number;
    sort?: string;
  };
  onFiltersChange: (filters: SearchFiltersProps['filters']) => void;
  availableTags?: string[];
  showAdvanced?: boolean;
}

const SORT_OPTIONS = [
  { value: 'downloads', label: 'Most Downloaded' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'recent', label: 'Recently Published' },
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'name', label: 'Name (A-Z)' },
];

const RATING_OPTIONS = [
  { value: 4, label: '4+ Stars' },
  { value: 3, label: '3+ Stars' },
  { value: 2, label: '2+ Stars' },
  { value: 0, label: 'Any Rating' },
];

const DOWNLOAD_OPTIONS = [
  { value: 1000, label: '1K+ Downloads' },
  { value: 100, label: '100+ Downloads' },
  { value: 10, label: '10+ Downloads' },
  { value: 0, label: 'Any' },
];

export function SearchFilters({
  filters,
  onFiltersChange,
  availableTags = [],
  showAdvanced = true,
}: SearchFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const updateFilter = (key: keyof typeof filters, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const addTag = (tag: string) => {
    if (tag && !filters.tags?.includes(tag)) {
      updateFilter('tags', [...(filters.tags || []), tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    updateFilter(
      'tags',
      (filters.tags || []).filter((t) => t !== tag)
    );
  };

  const clearFilters = () => {
    onFiltersChange({
      query: filters.query, // Keep the search query
      sort: 'downloads',
    });
  };

  const hasActiveFilters =
    filters.category ||
    (filters.tags && filters.tags.length > 0) ||
    (filters.minRating && filters.minRating > 0) ||
    (filters.minDownloads && filters.minDownloads > 0);

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Search rules..."
            value={filters.query || ''}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="pr-10"
          />
          {filters.query && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => updateFilter('query', '')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={filters.sort || 'downloads'}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="px-3 py-2 border rounded-md bg-background text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {showAdvanced && (
          <Button
            variant={isAdvancedOpen ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              {filters.category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('category', undefined)}
              />
            </Badge>
          )}

          {filters.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              <Tag className="h-3 w-3" />
              {tag}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
            </Badge>
          ))}

          {filters.minRating && filters.minRating > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3" />
              {filters.minRating}+
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('minRating', 0)}
              />
            </Badge>
          )}

          {filters.minDownloads && filters.minDownloads > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Download className="h-3 w-3" />
              {filters.minDownloads}+
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('minDownloads', 0)}
              />
            </Badge>
          )}

          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && isAdvancedOpen && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Tags
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  list="available-tags"
                />
                <datalist id="available-tags">
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              </div>
              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {availableTags.slice(0, 6).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={cn(
                        'cursor-pointer text-xs',
                        filters.tags?.includes(tag) && 'bg-primary/10'
                      )}
                      onClick={() =>
                        filters.tags?.includes(tag) ? removeTag(tag) : addTag(tag)
                      }
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Star className="h-4 w-4" />
                Minimum Rating
              </label>
              <select
                value={filters.minRating || 0}
                onChange={(e) => updateFilter('minRating', Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                {RATING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Downloads */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Download className="h-4 w-4" />
                Minimum Downloads
              </label>
              <select
                value={filters.minDownloads || 0}
                onChange={(e) => updateFilter('minDownloads', Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                {DOWNLOAD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Filters</label>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      minRating: 4,
                      minDownloads: 100,
                      sort: 'rating',
                    })
                  }
                >
                  Top Rated & Popular
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      sort: 'recent',
                      minRating: 0,
                      minDownloads: 0,
                    })
                  }
                >
                  Newest First
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
