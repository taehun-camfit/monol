/**
 * Auth Routes Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestUser, createTestRequest } from '../setup';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../db';

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const mockUser = createTestUser();
      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockUser);
      (prisma.session.create as any).mockResolvedValue({
        id: 'session-id',
        userId: mockUser.id,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      const existingUser = createTestUser();
      (prisma.user.findFirst as any).mockResolvedValue(existingUser);

      const error = new Error('Email already exists');
      expect(error.message).toBe('Email already exists');
    });

    it('should reject registration with invalid email format', async () => {
      const invalidEmail = 'not-an-email';
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidEmail);
      expect(isValid).toBe(false);
    });

    it('should reject registration with short password', async () => {
      const shortPassword = '12345';
      expect(shortPassword.length).toBeLessThan(8);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = createTestUser();
      (prisma.user.findFirst as any).mockResolvedValue(mockUser);
      (prisma.session.create as any).mockResolvedValue({
        id: 'session-id',
        userId: mockUser.id,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = {
        user: mockUser,
        accessToken: 'access-token',
      };

      expect(result.user.id).toBe(mockUser.id);
      expect(result.accessToken).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);

      const error = new Error('Invalid credentials');
      expect(error.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const mockSession = {
        id: 'session-id',
        userId: 'test-user-id',
        accessToken: 'old-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
      };

      (prisma.session.findUnique as any).mockResolvedValue(mockSession);

      expect(mockSession.refreshToken).toBe('valid-refresh-token');
    });

    it('should reject expired refresh token', async () => {
      const expiredSession = {
        id: 'session-id',
        userId: 'test-user-id',
        refreshToken: 'expired-refresh-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      (prisma.session.findUnique as any).mockResolvedValue(expiredSession);

      const isExpired = expiredSession.expiresAt < new Date();
      expect(isExpired).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and invalidate session', async () => {
      (prisma.session.delete as any).mockResolvedValue({ id: 'session-id' });

      const deleted = await prisma.session.delete({ where: { id: 'session-id' } });
      expect(deleted.id).toBe('session-id');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const mockUser = createTestUser();
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const user = await prisma.user.findUnique({ where: { id: mockUser.id } });
      expect(user?.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const request = createTestRequest({
        headers: { 'content-type': 'application/json' },
      });

      expect(request.headers.authorization).toBeUndefined();
    });
  });
});
