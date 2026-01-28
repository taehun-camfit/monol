/**
 * API Types
 * 서버 응답 타입 정의
 */

// ============================================================================
// Base Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  settings?: TeamSettings;
  owner?: User;
  memberCount: number;
  ruleCount: number;
  proposalCount?: number;
  myRole?: TeamRole;
  createdAt: string;
  updatedAt: string;
}

export interface TeamSettings {
  minApprovers?: number;
  requireReview?: boolean;
  allowSelfApproval?: boolean;
  autoMerge?: boolean;
}

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface TeamMember {
  id: string;
  user: User;
  role: TeamRole;
  points: number;
  joinedAt: string;
}

// ============================================================================
// Rule Types
// ============================================================================

export interface Rule {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  category: string;
  severity: RuleSeverity;
  tags: string[];
  content?: string;
  examples?: {
    good?: string[];
    bad?: string[];
  };
  conditions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  visibility: RuleVisibility;
  version: string;
  downloads?: number;
  rating?: number;
  author?: User;
  team?: Pick<Team, 'id' | 'name' | 'slug'>;
  listedInMarketplace?: boolean;
  publishedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    comments?: number;
    versions?: number;
    adoptions?: number;
    reviews?: number;
  };
}

export type RuleSeverity = 'ERROR' | 'WARNING' | 'INFO';
export type RuleVisibility = 'PRIVATE' | 'TEAM' | 'PUBLIC';

export interface RuleVersion {
  id: string;
  version: string;
  content: Record<string, unknown>;
  changes: string;
  authorId: string;
  createdAt: string;
}

// ============================================================================
// Proposal Types
// ============================================================================

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: ProposalType;
  status: ProposalStatus;
  changes: Record<string, unknown>;
  requiredApprovals: number;
  currentApprovals: number;
  author?: User;
  rule?: Rule;
  reviews?: ProposalReview[];
  comments?: Comment[];
  submittedAt?: string;
  mergedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    reviews?: number;
    comments?: number;
  };
}

export type ProposalType = 'CREATE' | 'UPDATE' | 'DELETE' | 'DEPRECATE';
export type ProposalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED' | 'CANCELLED';

export interface ProposalReview {
  id: string;
  decision: ReviewDecision;
  comment?: string;
  reviewer: User;
  createdAt: string;
}

export type ReviewDecision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface TeamAnalytics {
  totalRules: number;
  totalMembers: number;
  totalProposals: number;
  pendingProposals: number;
  recentActivity: number;
  adoptions: number;
}

export interface RuleAnalytics {
  byCategory: { category: string; count: number }[];
  bySeverity: { severity: RuleSeverity; count: number }[];
  byVisibility: { visibility: RuleVisibility; count: number }[];
  topDownloaded: Pick<Rule, 'id' | 'ruleId' | 'name' | 'downloads' | 'rating'>[];
  recentRules: (Pick<Rule, 'id' | 'ruleId' | 'name' | 'createdAt'> & {
    author?: { displayName: string };
  })[];
}

export interface ProposalAnalytics {
  byStatus: { status: ProposalStatus; count: number }[];
  byType: { type: ProposalType; count: number }[];
  avgTimeToMergeHours: number;
  topContributors: {
    user?: User;
    proposalCount: number;
  }[];
}

export interface MemberAnalytics {
  byRole: { role: TeamRole; count: number }[];
  topRuleCreators: {
    user?: User;
    rulesCreated: number;
  }[];
  leaderboard: {
    user: User;
    points: number;
    role: TeamRole;
  }[];
}

export interface ActivityTimeline {
  timeline: {
    date: string;
    activities: Record<string, number>;
  }[];
  recent: Activity[];
}

export interface Activity {
  id: string;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
  user?: User;
  createdAt: string;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  rules?: T[];
  proposals?: T[];
  pagination: Pagination;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
}

export interface LoginResponse {
  user: User;
  token: AuthToken;
}

// ============================================================================
// Collection Types (Marketplace)
// ============================================================================

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ruleIds: string[];
  featured: boolean;
  rules?: Rule[];
  createdAt: string;
  updatedAt: string;
}
