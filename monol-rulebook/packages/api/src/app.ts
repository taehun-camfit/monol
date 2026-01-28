/**
 * Monol Rulebook API Server
 *
 * Express 기반 REST API 서버
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { prisma } from './db.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { teamsRouter } from './routes/teams.js';
import { rulesRouter } from './routes/rules.js';
import { proposalsRouter } from './routes/proposals.js';
import { marketplaceRouter } from './routes/marketplace.js';
import { analyticsRouter } from './routes/analytics.js';
import { notificationsRouter } from './routes/notifications.js';
import { reviewsRouter } from './routes/reviews.js';
import { favoritesRouter } from './routes/favorites.js';
import { healthRouter } from './routes/health.js';

// ============================================================================
// App Configuration
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3030;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// Middleware
// ============================================================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(pinoHttp({
  logger,
  autoLogging: NODE_ENV === 'production',
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT ? parseInt(process.env.RATE_LIMIT, 10) : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later.' } },
});
app.use('/api/', limiter);

// ============================================================================
// Routes
// ============================================================================

// Health check (no auth required)
app.use('/api/health', healthRouter);

// Auth routes
app.use('/api/auth', authRouter);

// API routes (most require auth)
app.use('/api/teams', teamsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/favorites', favoritesRouter);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// Server Startup
// ============================================================================

async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected');

    // Start server
    const server = app.listen(PORT, () => {
      logger.info({ port: PORT, env: NODE_ENV }, 'Server started');
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📚 API docs: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      server.close(async () => {
        logger.info('HTTP server closed');

        await prisma.$disconnect();
        logger.info('Database disconnected');

        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

export default app;
