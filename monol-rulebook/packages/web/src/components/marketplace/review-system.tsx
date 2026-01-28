'use client';

import { useState } from 'react';
import { Star, ThumbsUp, Flag, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  content: string;
  pros?: string[];
  cons?: string[];
  verified: boolean;
  helpfulCount: number;
  createdAt: string;
  editedAt?: string | null;
  author: {
    id: string;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

interface ReviewListProps {
  reviews: Review[];
  stats: ReviewStats;
  onHelpful?: (reviewId: string) => void;
  onReport?: (reviewId: string) => void;
  helpfulMarked?: Set<string>;
}

interface ReviewFormProps {
  onSubmit: (data: {
    rating: number;
    title?: string;
    content: string;
    pros?: string[];
    cons?: string[];
  }) => void;
  isSubmitting?: boolean;
}

// Star Rating Input Component
function StarRatingInput({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="focus:outline-none"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={cn(
              sizeClasses[size],
              'transition-colors',
              (hovered ? star <= hovered : star <= value)
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-gray-300'
            )}
          />
        </button>
      ))}
    </div>
  );
}

// Star Rating Display Component
function StarRatingDisplay({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: 'xs' | 'sm' | 'md';
}) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
  };

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClasses[size],
            star <= rating
              ? 'text-yellow-500 fill-yellow-500'
              : star - 0.5 <= rating
              ? 'text-yellow-500 fill-yellow-500/50'
              : 'text-gray-300'
          )}
        />
      ))}
    </div>
  );
}

// Rating Distribution Chart
function RatingDistribution({ stats }: { stats: ReviewStats }) {
  const maxCount = Math.max(...Object.values(stats.ratingDistribution), 1);

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = stats.ratingDistribution[rating] || 0;
        const percentage = (count / maxCount) * 100;

        return (
          <div key={rating} className="flex items-center gap-2 text-sm">
            <span className="w-8 text-right">{rating}</span>
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-8 text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// Review Card
function ReviewCard({
  review,
  onHelpful,
  onReport,
  isHelpfulMarked,
}: {
  review: Review;
  onHelpful?: () => void;
  onReport?: () => void;
  isHelpfulMarked?: boolean;
}) {
  const authorName = review.author.displayName || review.author.username || 'Unknown';
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  return (
    <div className="border-b last:border-b-0 py-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={review.author.avatarUrl || undefined} />
          <AvatarFallback>{authorInitials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{authorName}</span>
            {review.verified && (
              <Badge variant="outline" className="text-xs gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                Verified
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString()}
              {review.editedAt && ' (edited)'}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <StarRatingDisplay rating={review.rating} size="xs" />
            {review.title && (
              <span className="font-medium text-sm">{review.title}</span>
            )}
          </div>

          <p className="mt-2 text-sm text-muted-foreground">{review.content}</p>

          {(review.pros?.length || review.cons?.length) && (
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              {review.pros && review.pros.length > 0 && (
                <div>
                  <p className="font-medium text-green-600 mb-1">Pros</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {review.pros.map((pro, i) => (
                      <li key={i}>{pro}</li>
                    ))}
                  </ul>
                </div>
              )}
              {review.cons && review.cons.length > 0 && (
                <div>
                  <p className="font-medium text-red-600 mb-1">Cons</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {review.cons.map((con, i) => (
                      <li key={i}>{con}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={cn('gap-1', isHelpfulMarked && 'text-primary')}
              onClick={onHelpful}
            >
              <ThumbsUp className="h-3 w-3" />
              Helpful ({review.helpfulCount})
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onClick={onReport}>
              <Flag className="h-3 w-3" />
              Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Review List Component
export function ReviewList({
  reviews,
  stats,
  onHelpful,
  onReport,
  helpfulMarked = new Set(),
}: ReviewListProps) {
  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold">{stats.averageRating.toFixed(1)}</div>
                <StarRatingDisplay rating={stats.averageRating} size="md" />
                <div className="text-sm text-muted-foreground mt-1">
                  {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <RatingDistribution stats={stats} />
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No reviews yet. Be the first to review!
            </p>
          ) : (
            <div>
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onHelpful={onHelpful ? () => onHelpful(review.id) : undefined}
                  onReport={onReport ? () => onReport(review.id) : undefined}
                  isHelpfulMarked={helpfulMarked.has(review.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Review Form Component
export function ReviewForm({ onSubmit, isSubmitting }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pros, setPros] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);
  const [prosInput, setProsInput] = useState('');
  const [consInput, setConsInput] = useState('');

  const addPro = () => {
    if (prosInput.trim()) {
      setPros([...pros, prosInput.trim()]);
      setProsInput('');
    }
  };

  const addCon = () => {
    if (consInput.trim()) {
      setCons([...cons, consInput.trim()]);
      setConsInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !content.trim()) return;

    onSubmit({
      rating,
      title: title.trim() || undefined,
      content: content.trim(),
      pros: pros.length > 0 ? pros : undefined,
      cons: cons.length > 0 ? cons : undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Write a Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rating *</label>
            <StarRatingInput value={rating} onChange={setRating} size="lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="Summarize your experience"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Review *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background min-h-[100px]"
              placeholder="Share your experience with this rule..."
              minLength={10}
              maxLength={5000}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-green-600">
                Pros (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prosInput}
                  onChange={(e) => setProsInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPro())}
                  className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="Add a pro..."
                />
                <Button type="button" variant="outline" size="sm" onClick={addPro}>
                  Add
                </Button>
              </div>
              <ul className="mt-2 space-y-1">
                {pros.map((pro, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="text-green-600">+</span>
                    {pro}
                    <button
                      type="button"
                      onClick={() => setPros(pros.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-red-600">
                Cons (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={consInput}
                  onChange={(e) => setConsInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCon())}
                  className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="Add a con..."
                />
                <Button type="button" variant="outline" size="sm" onClick={addCon}>
                  Add
                </Button>
              </div>
              <ul className="mt-2 space-y-1">
                {cons.map((con, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="text-red-600">-</span>
                    {con}
                    <button
                      type="button"
                      onClick={() => setCons(cons.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Button type="submit" disabled={rating === 0 || !content.trim() || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
