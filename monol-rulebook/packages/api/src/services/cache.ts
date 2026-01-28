/**
 * Cache Service
 *
 * Provides caching layer for API responses using Redis or in-memory fallback.
 */

import { logger } from '../utils/logger.js';

// In-memory cache for development/fallback
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

// Redis client (lazy initialization)
let redisClient: {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { EX?: number }) => Promise<unknown>;
  del: (key: string | string[]) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
} | null = null;

/**
 * Initialize Redis connection
 */
export async function initializeCache(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      // Dynamic import to avoid issues if Redis is not installed
      const { createClient } = await import('redis');
      const client = createClient({ url: redisUrl });

      client.on('error', (err) => {
        logger.error({ err }, 'Redis client error');
      });

      client.on('connect', () => {
        logger.info('Redis connected');
      });

      await client.connect();
      redisClient = client as typeof redisClient;
    } catch (error) {
      logger.warn({ error }, 'Redis not available, using in-memory cache');
    }
  } else {
    logger.info('No REDIS_URL configured, using in-memory cache');
  }
}

/**
 * Get cached value
 */
export async function get<T>(key: string): Promise<T | null> {
  try {
    if (redisClient) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    }

    // In-memory fallback
    const cached = memoryCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      memoryCache.delete(key);
      return null;
    }

    return JSON.parse(cached.value);
  } catch (error) {
    logger.error({ error, key }, 'Cache get error');
    return null;
  }
}

/**
 * Set cached value
 */
export async function set<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    const serialized = JSON.stringify(value);

    if (redisClient) {
      await redisClient.set(key, serialized, { EX: ttlSeconds });
    } else {
      // In-memory fallback
      memoryCache.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  } catch (error) {
    logger.error({ error, key }, 'Cache set error');
  }
}

/**
 * Delete cached value(s)
 */
export async function del(keys: string | string[]): Promise<void> {
  try {
    const keyArray = Array.isArray(keys) ? keys : [keys];

    if (redisClient) {
      if (keyArray.length > 0) {
        await redisClient.del(keyArray);
      }
    } else {
      // In-memory fallback
      keyArray.forEach((key) => memoryCache.delete(key));
    }
  } catch (error) {
    logger.error({ error, keys }, 'Cache delete error');
  }
}

/**
 * Delete cached values by pattern
 */
export async function delPattern(pattern: string): Promise<void> {
  try {
    if (redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      // In-memory fallback - simple pattern matching
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
        }
      }
    }
  } catch (error) {
    logger.error({ error, pattern }, 'Cache delete pattern error');
  }
}

/**
 * Cache key generators
 */
export const cacheKeys = {
  // Team cache keys
  team: (slug: string) => `team:${slug}`,
  teamMembers: (slug: string) => `team:${slug}:members`,
  teamRules: (slug: string, page: number, filters: string) =>
    `team:${slug}:rules:${page}:${filters}`,
  teamStats: (slug: string) => `team:${slug}:stats`,

  // Rule cache keys
  rule: (teamSlug: string, ruleId: string) => `rule:${teamSlug}:${ruleId}`,
  ruleVersions: (teamSlug: string, ruleId: string) =>
    `rule:${teamSlug}:${ruleId}:versions`,

  // Proposal cache keys
  proposal: (id: string) => `proposal:${id}`,
  proposalList: (teamSlug: string, filters: string) =>
    `proposals:${teamSlug}:${filters}`,

  // Marketplace cache keys
  marketplaceRules: (query: string) => `marketplace:rules:${query}`,
  marketplaceTrending: () => `marketplace:trending`,
  marketplaceCategories: () => `marketplace:categories`,
  marketplaceRule: (id: string) => `marketplace:rule:${id}`,

  // User cache keys
  user: (id: string) => `user:${id}`,
  userTeams: (id: string) => `user:${id}:teams`,

  // Analytics cache keys
  analytics: (teamSlug: string, period: string) =>
    `analytics:${teamSlug}:${period}`,
};

/**
 * Cache invalidation helpers
 */
export const invalidate = {
  team: async (slug: string) => {
    await del([
      cacheKeys.team(slug),
      cacheKeys.teamMembers(slug),
      cacheKeys.teamStats(slug),
    ]);
    await delPattern(`team:${slug}:rules:*`);
    await delPattern(`analytics:${slug}:*`);
  },

  rule: async (teamSlug: string, ruleId: string) => {
    await del([
      cacheKeys.rule(teamSlug, ruleId),
      cacheKeys.ruleVersions(teamSlug, ruleId),
    ]);
    await delPattern(`team:${teamSlug}:rules:*`);
    // Also invalidate marketplace if rule is published
    await delPattern(`marketplace:*`);
  },

  proposal: async (id: string, teamSlug: string) => {
    await del([cacheKeys.proposal(id)]);
    await delPattern(`proposals:${teamSlug}:*`);
  },

  user: async (id: string) => {
    await del([cacheKeys.user(id), cacheKeys.userTeams(id)]);
  },

  marketplace: async () => {
    await delPattern(`marketplace:*`);
  },
};

/**
 * Cache middleware for Express
 */
export function cacheMiddleware(
  keyGenerator: (req: unknown) => string,
  ttlSeconds: number = 300
) {
  return async (
    req: { method: string },
    res: {
      json: (body: unknown) => void;
      set: (header: string, value: string) => void;
    },
    next: () => void
  ) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    const key = keyGenerator(req);
    const cached = await get(key);

    if (cached) {
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to cache the response
    res.json = (body: unknown) => {
      // Don't cache error responses
      if (body && typeof body === 'object' && 'error' in body) {
        return originalJson(body);
      }

      // Cache the response
      set(key, body, ttlSeconds).catch((err) => {
        logger.error({ err }, 'Failed to cache response');
      });

      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

/**
 * Cleanup expired items from memory cache
 */
function cleanupMemoryCache(): void {
  const now = Date.now();
  for (const [key, { expiresAt }] of memoryCache.entries()) {
    if (now > expiresAt) {
      memoryCache.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupMemoryCache, 60000);
