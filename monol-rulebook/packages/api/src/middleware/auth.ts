/**
 * Authentication Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { UnauthorizedError, ForbiddenError } from './error.js';
import type { TeamRole } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface JWTPayload {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    displayName: string;
  };
  teamMembership?: {
    teamId: string;
    role: TeamRole;
  };
}

// ============================================================================
// JWT Utilities
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Require authentication
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication (sets user if token present)
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
        },
      });

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch {
    // Ignore auth errors for optional auth
    next();
  }
}

/**
 * Require team membership with minimum role
 */
export function requireTeamRole(minRole: TeamRole) {
  const roleHierarchy: Record<TeamRole, number> = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3,
  };

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const teamId = req.params.teamId || req.body.teamId;

      if (!teamId) {
        throw new ForbiddenError('Team ID required');
      }

      const membership = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: req.user.id,
            teamId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenError('Not a member of this team');
      }

      if (roleHierarchy[membership.role] < roleHierarchy[minRole]) {
        throw new ForbiddenError(`Requires ${minRole} role or higher`);
      }

      req.teamMembership = {
        teamId,
        role: membership.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require team owner
 */
export const requireTeamOwner = requireTeamRole('OWNER');

/**
 * Require team admin
 */
export const requireTeamAdmin = requireTeamRole('ADMIN');

/**
 * Require team member
 */
export const requireTeamMember = requireTeamRole('MEMBER');

export default {
  requireAuth,
  optionalAuth,
  requireTeamRole,
  requireTeamOwner,
  requireTeamAdmin,
  requireTeamMember,
  generateToken,
  generateRefreshToken,
  verifyToken,
};
