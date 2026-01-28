/**
 * Health Check Routes
 */

import { Router } from 'express';
import { prisma } from '../db.js';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: process.uptime(),
  };

  res.json(health);
});

healthRouter.get('/ready', async (req, res) => {
  const checks: Record<string, string> = {};
  let allHealthy = true;

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'connected';
  } catch {
    checks.database = 'disconnected';
    allHealthy = false;
  }

  // Check Redis if configured
  if (process.env.REDIS_URL) {
    try {
      // Simplified Redis check - in production, use the cache service
      checks.redis = 'configured';
    } catch {
      checks.redis = 'disconnected';
      allHealthy = false;
    }
  }

  const response = {
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  };

  res.status(allHealthy ? 200 : 503).json(response);
});

healthRouter.get('/live', (req, res) => {
  res.json({
    status: 'live',
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;
