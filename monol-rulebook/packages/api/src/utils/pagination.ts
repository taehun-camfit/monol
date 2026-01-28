/**
 * Pagination Utilities
 *
 * Helper functions for consistent pagination across the API.
 */

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Parse pagination params from query string
 */
export function parsePaginationParams(query: {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  order?: string;
}): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
  const sort = query.sort || 'createdAt';
  const order = (query.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  return { page, limit, sort, order };
}

/**
 * Calculate Prisma skip value from page and limit
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Build pagination metadata
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  return {
    data,
    pagination: buildPaginationMeta(total, params.page, params.limit),
  };
}

/**
 * Build Prisma orderBy object
 */
export function buildOrderBy(
  sort: string,
  order: 'asc' | 'desc',
  allowedFields: string[] = ['createdAt', 'updatedAt', 'name']
): Record<string, 'asc' | 'desc'> | undefined {
  if (!allowedFields.includes(sort)) {
    sort = 'createdAt';
  }

  return { [sort]: order };
}

/**
 * Build Prisma pagination object
 */
export function buildPrismaQuery(params: PaginationParams) {
  return {
    skip: calculateSkip(params.page, params.limit),
    take: params.limit,
    orderBy: buildOrderBy(params.sort || 'createdAt', params.order || 'desc'),
  };
}

/**
 * Cursor-based pagination for large datasets
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationMeta {
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  pagination: CursorPaginationMeta;
}

/**
 * Build cursor-based pagination result
 */
export function createCursorPaginatedResult<T extends { id: string }>(
  data: T[],
  limit: number,
  hasMore: boolean
): CursorPaginatedResult<T> {
  const nextCursor = data.length > 0 && hasMore ? data[data.length - 1].id : null;
  const prevCursor = data.length > 0 ? data[0].id : null;

  return {
    data,
    pagination: {
      nextCursor,
      prevCursor,
      hasMore,
    },
  };
}

/**
 * Encode cursor value (base64)
 */
export function encodeCursor(value: string): string {
  return Buffer.from(value).toString('base64url');
}

/**
 * Decode cursor value (base64)
 */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}
