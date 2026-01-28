/**
 * Input Validation Schemas
 *
 * Zod schemas for validating API inputs.
 * Following the principle of "validate at the boundary".
 */

import { z } from 'zod';

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
});

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  name: z.string().min(1).max(100).trim(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// User schemas
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  avatar: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});

// Team schemas
export const createTeamSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  isPublic: z.boolean().optional(),
});

export const inviteToTeamSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
  expiresIn: z.coerce.number().int().min(1).max(30).default(7), // Days
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

// Rule schemas
export const createRuleSchema = z.object({
  ruleId: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Rule ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  content: z.string().min(1).max(50000),
  category: z.string().min(1).max(100),
  tags: z.array(z.string().max(50)).max(20).default([]),
  severity: z.enum(['error', 'warning', 'info']).default('warning'),
  examples: z
    .object({
      good: z.array(z.string().max(5000)).max(10).optional(),
      bad: z.array(z.string().max(5000)).max(10).optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateRuleSchema = createRuleSchema.partial().omit({ ruleId: true });

export const ruleFilterSchema = z.object({
  category: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  severity: z.enum(['error', 'warning', 'info']).optional(),
  q: z.string().max(200).optional(),
  isPublished: z.coerce.boolean().optional(),
});

// Proposal schemas
export const createProposalSchema = z.object({
  type: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  ruleId: z.string().uuid().optional(), // For UPDATE/DELETE
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional(),
  changes: z
    .object({
      before: z.record(z.unknown()).optional(),
      after: z.record(z.unknown()).optional(),
    })
    .optional(),
  ruleData: createRuleSchema.optional(), // For CREATE proposals
});

export const updateProposalSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).optional(),
  changes: z
    .object({
      before: z.record(z.unknown()).optional(),
      after: z.record(z.unknown()).optional(),
    })
    .optional(),
  ruleData: createRuleSchema.partial().optional(),
});

export const reviewProposalSchema = z.object({
  action: z.enum(['APPROVE', 'REQUEST_CHANGES', 'REJECT']),
  comment: z.string().max(2000).optional(),
});

// Comment schemas
export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
  parentId: z.string().uuid().optional(),
  line: z.number().int().min(1).optional(), // For inline comments
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
});

// Marketplace schemas
export const publishRuleSchema = z.object({
  ruleId: z.string().uuid(),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
  changelog: z.string().max(5000).optional(),
  license: z.string().max(100).default('MIT'),
});

export const adoptRuleSchema = z.object({
  marketplaceRuleId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  customize: z.boolean().default(false),
});

export const reviewMarketplaceRuleSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().max(2000).optional(),
});

export const marketplaceSearchSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['downloads', 'rating', 'recent', 'trending']).default('trending'),
});

// Analytics schemas
export const analyticsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  metrics: z.array(z.string()).optional(),
});

// Webhook schemas
export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).max(256).optional(),
  isActive: z.boolean().default(true),
});

export const updateWebhookSchema = createWebhookSchema.partial();

// Export type helpers
export type PaginationInput = z.infer<typeof paginationSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
export type MarketplaceSearchInput = z.infer<typeof marketplaceSearchSchema>;
