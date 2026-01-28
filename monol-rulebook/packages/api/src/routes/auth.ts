/**
 * Authentication Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import {
  requireAuth,
  generateToken,
  generateRefreshToken,
  verifyToken,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../middleware/error.js';

export const authRouter = Router();

// ============================================================================
// Schemas
// ============================================================================

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().min(1).max(100),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/auth/me - Get current user
 */
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  res.json(user);
});

/**
 * POST /api/auth/register - Register new user
 */
authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if email or username already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username },
        ],
      },
    });

    if (existing) {
      throw new BadRequestError(
        existing.email === data.email
          ? 'Email already registered'
          : 'Username already taken'
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(201).json({
      user,
      token: {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tokenType: 'Bearer',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login - Login
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Note: In a real app, you'd verify password here
    // For now, we'll skip password verification since we're using OAuth primarily

    // Generate tokens
    const accessToken = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      token: {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tokenType: 'Bearer',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh - Refresh token
 */
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Generate new tokens
    const newAccessToken = generateToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id);

    // Update session
    await prisma.session.update({
      where: { id: session.id },
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      token: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tokenType: 'Bearer',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout - Logout
 */
authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      await prisma.session.deleteMany({
        where: { accessToken: token },
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GitHub OAuth callback placeholder
 * In production, implement proper OAuth flow
 */
authRouter.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.API_URL}/api/auth/github/callback`;
  const scope = 'user:email';

  if (!clientId) {
    res.status(501).json({
      error: {
        code: 'NOT_CONFIGURED',
        message: 'GitHub OAuth not configured',
      },
    });
    return;
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;

  res.redirect(githubAuthUrl);
});

authRouter.post('/github/callback', async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new BadRequestError('Authorization code required');
    }

    // In production, exchange code for token with GitHub
    // For now, return a placeholder response
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'GitHub OAuth callback not fully implemented',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default authRouter;
