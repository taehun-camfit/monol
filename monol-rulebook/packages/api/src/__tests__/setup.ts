/**
 * Test Setup
 * 테스트 환경 설정
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test setup
beforeAll(async () => {
  // Setup test database connection
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test database
  console.log('Cleaning up test environment...');
});

beforeEach(async () => {
  // Reset database state before each test
});

afterEach(async () => {
  // Cleanup after each test
});

// Test utilities
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: null,
  githubId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestTeam = (overrides = {}) => ({
  id: 'test-team-id',
  name: 'Test Team',
  slug: 'test-team',
  description: 'A test team',
  avatarUrl: null,
  settings: {},
  ownerId: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestRule = (overrides = {}) => ({
  id: 'test-rule-id',
  ruleId: 'test-001',
  name: 'Test Rule',
  description: 'A test rule',
  content: '# Test Rule Content',
  category: 'test/category',
  severity: 'WARNING',
  tags: ['test', 'example'],
  visibility: 'TEAM',
  version: '1.0.0',
  changelog: [],
  listedInMarketplace: false,
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  trendingScore: 0,
  examples: {},
  conditions: {},
  metadata: {},
  teamId: 'test-team-id',
  authorId: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  publishedAt: null,
  archivedAt: null,
  originRuleId: null,
  ...overrides,
});

export const createTestProposal = (overrides = {}) => ({
  id: 'test-proposal-id',
  title: 'Test Proposal',
  description: 'A test proposal',
  type: 'CREATE',
  status: 'DRAFT',
  changes: {},
  requiredApprovals: 1,
  currentApprovals: 0,
  teamId: 'test-team-id',
  ruleId: null,
  authorId: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  submittedAt: null,
  mergedAt: null,
  closedAt: null,
  ...overrides,
});

// Mock JWT token
export const generateTestToken = (userId = 'test-user-id') => {
  return `test-token-${userId}`;
};

// API test helper
export const createTestRequest = (overrides = {}) => ({
  headers: {
    authorization: `Bearer ${generateTestToken()}`,
    'content-type': 'application/json',
  },
  body: {},
  params: {},
  query: {},
  ...overrides,
});
