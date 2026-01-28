/**
 * Monol Rulebook - Type Definitions
 */

// ============================================================================
// Core Types
// ============================================================================

export type Severity = 'error' | 'warning' | 'info';
export type Scope = 'global' | 'project' | 'package';
export type MergeStrategy = 'override' | 'merge' | 'append';
export type ConflictResolution = 'local-wins' | 'parent-wins' | 'manual';
export type RuleStatus = 'draft' | 'active' | 'deprecated';
export type Environment = 'development' | 'staging' | 'production';

// ============================================================================
// Rule Metadata & Versioning
// ============================================================================

/** 규칙 변경 이력 항목 */
export interface ChangelogEntry {
  /** 버전 번호 (semver) */
  version: string;

  /** 변경 일시 (ISO 8601) */
  date: string;

  /** 변경 작성자 */
  author: string;

  /** 변경 내용 요약 */
  changes: string;

  /** 이전 규칙 스냅샷 (롤백용) */
  snapshot?: Partial<Rule>;
}

/** 규칙 메타데이터 */
export interface RuleMetadata {
  /** 규칙 작성자 */
  author?: string;

  /** 리뷰어 */
  reviewedBy?: string;

  /** 규칙 상태 */
  status: RuleStatus;

  /** 현재 버전 */
  version: string;

  /** 변경 이력 */
  changelog?: ChangelogEntry[];

  /** 승인일 */
  approvedAt?: string;

  /** 폐기 예정일 (deprecated인 경우) */
  deprecatedAt?: string;

  /** 폐기 사유 */
  deprecationReason?: string;
}

// ============================================================================
// Rule Dependencies
// ============================================================================

/** 규칙 의존성 정의 */
export interface RuleDependencies {
  /** 이 규칙 적용 전 필요한 규칙들 */
  requires?: string[];

  /** 이 규칙과 충돌하는 규칙들 (동시 적용 불가) */
  conflicts?: string[];

  /** 상속받는 규칙 ID (부모 규칙의 설정 상속) */
  extends?: string;

  /** 이 규칙을 대체하는 규칙 (deprecated 시) */
  replacedBy?: string;
}

// ============================================================================
// Rule Conditions
// ============================================================================

/** 규칙 조건부 적용 설정 */
export interface RuleCondition {
  /** 적용할 파일 패턴 (glob) */
  filePatterns?: string[];

  /** 제외할 파일 패턴 (glob) */
  excludePatterns?: string[];

  /** 적용할 Git 브랜치 */
  branches?: string[];

  /** 적용할 환경 */
  environments?: Environment[];

  /** 적용 시작일 */
  activeFrom?: string;

  /** 적용 종료일 */
  activeUntil?: string;
}

// ============================================================================
// Dependency Graph Types
// ============================================================================

/** 의존성 그래프 노드 */
export interface DependencyNode {
  ruleId: string;
  requires: string[];
  conflicts: string[];
  extends?: string;
}

/** 의존성 그래프 */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;

  /** 순환 의존성 경로 */
  cycles: string[][];

  /** 충돌 규칙 쌍 */
  conflictPairs: [string, string][];
}

/** 충돌 리포트 */
export interface ConflictReport {
  hasConflicts: boolean;
  conflicts: ConflictDetail[];
}

/** 충돌 상세 */
export interface ConflictDetail {
  ruleA: string;
  ruleB: string;
  reason: 'explicit' | 'mutual' | 'transitive';
  path?: string[];
}

// ============================================================================
// Versioning Types
// ============================================================================

/** 규칙 변경 비교 결과 */
export interface RuleDiff {
  ruleId: string;
  fromVersion: string;
  toVersion: string;
  changes: DiffChange[];
}

/** 개별 변경 항목 */
export interface DiffChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  type: 'added' | 'removed' | 'modified';
}

// ============================================================================
// Rule Definition
// ============================================================================

export interface RuleExamples {
  good: string[];
  bad: string[];
}

export interface Rule {
  /** 고유 식별자 (예: naming-001) */
  id: string;

  /** 규칙 이름 */
  name: string;

  /** 상세 설명 */
  description: string;

  /** 카테고리 경로 (예: code/naming) */
  category: string;

  /** 태그 목록 */
  tags: string[];

  /** 심각도 */
  severity: Severity;

  /** 예시 코드 */
  examples?: RuleExamples;

  /** 예외 상황 설명 */
  exceptions?: string[];

  /** 관련 규칙 ID 목록 */
  related?: string[];

  /** 생성일 (ISO 8601) */
  created: string;

  /** 수정일 (ISO 8601) */
  updated: string;

  /** 적용 범위 */
  scope?: Scope;

  /** 출처 (파일 경로 또는 URL) */
  source?: string;

  /** 활성화 여부 */
  enabled?: boolean;

  /** 자동 적용 여부 */
  autoApply?: boolean;

  /** 플랫폼별 설정 */
  platforms?: PlatformConfig;

  /** 규칙 메타데이터 (버전, 작성자, 상태) */
  metadata?: RuleMetadata;

  /** 규칙 의존성 (requires, conflicts, extends) */
  dependencies?: RuleDependencies;

  /** 조건부 적용 설정 */
  conditions?: RuleCondition;
}

// ============================================================================
// Rule Index
// ============================================================================

export interface IndexMetadata {
  version: string;
  lastUpdated: string;
  scope: Scope;
  description?: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description?: string;
  ruleCount: number;
  subcategories?: CategoryInfo[];
}

export interface RuleRef {
  id: string;
  file: string;
  category: string;
  tags: string[];
}

export interface RuleIndex {
  metadata: IndexMetadata;
  categories: CategoryInfo[];
  tags: string[];
  rules: RuleRef[];
}

// ============================================================================
// Rulebook Configuration
// ============================================================================

export interface ConfigMetadata {
  version: string;
  scope: Scope;
  parentScope?: string;
}

export interface HierarchyConfig {
  enabled: boolean;
  mergeStrategy: MergeStrategy;
  conflictResolution: ConflictResolution;
}

export interface InheritanceEntry {
  path: string;
  priority: number;
}

export interface RulebookConfig {
  metadata: ConfigMetadata;
  hierarchy: HierarchyConfig;
  inheritance: InheritanceEntry[];
}

// ============================================================================
// Platform Adapters
// ============================================================================

export interface PlatformConfig {
  cursor?: CursorConfig;
  claude?: ClaudeConfig;
}

export interface CursorConfig {
  enabled: boolean;
  includeInRules: boolean;
}

export interface ClaudeConfig {
  enabled: boolean;
  ruleFile?: string;
}

export interface PlatformAdapter {
  name: string;

  /** 현재 플랫폼 규칙 읽기 */
  read(): Promise<string>;

  /** 규칙을 플랫폼 포맷으로 변환 */
  format(rules: Rule[]): string;

  /** 플랫폼에 규칙 쓰기 */
  write(content: string): Promise<void>;

  /** 동기화 실행 */
  sync(rules: Rule[]): Promise<SyncResult>;
}

export interface SyncResult {
  success: boolean;
  platform: string;
  rulesCount: number;
  outputPath: string;
  error?: string;
}

/** 양방향 동기화 방향 */
export type SyncDirection = 'push' | 'pull' | 'both';

/** 양방향 동기화 결과 */
export interface BidirectionalSyncResult {
  success: boolean;
  direction: SyncDirection;
  platform: string;

  /** Push 결과 (rules → platform) */
  pushed?: {
    count: number;
    rules: string[];
  };

  /** Pull 결과 (platform → rules) */
  pulled?: {
    count: number;
    rules: string[];
    newRules: string[];
    updatedRules: string[];
  };

  /** 충돌 목록 */
  conflicts?: SyncConflict[];

  error?: string;
}

/** 동기화 충돌 */
export interface SyncConflict {
  ruleId: string;
  localVersion: string;
  remoteVersion: string;
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  resolution?: 'local' | 'remote' | 'merge' | 'skip';
}

/** 동기화 Diff 결과 */
export interface SyncDiffResult {
  platform: string;

  /** 로컬에만 있는 규칙 */
  localOnly: string[];

  /** 플랫폼에만 있는 규칙 */
  remoteOnly: string[];

  /** 양쪽에 있지만 다른 규칙 */
  different: {
    ruleId: string;
    differences: DiffChange[];
  }[];

  /** 동일한 규칙 */
  identical: string[];
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchOptions {
  /** 태그 필터 */
  tags?: string[];

  /** 카테고리 필터 */
  category?: string;

  /** 심각도 필터 */
  severity?: Severity;

  /** 키워드 검색 */
  keyword?: string;

  /** 최대 결과 수 */
  limit?: number;

  /** 활성화된 규칙만 */
  enabledOnly?: boolean;

  /** 규칙 상태 필터 */
  status?: RuleStatus;

  /** 특정 규칙에 의존하는 규칙 찾기 */
  dependsOn?: string;

  /** 특정 규칙과 충돌하는 규칙 찾기 */
  conflictsWith?: string;

  /** 파일 패턴에 해당하는 규칙 찾기 */
  forFile?: string;

  /** 환경에 해당하는 규칙 찾기 */
  forEnvironment?: Environment;
}

export interface SearchResult {
  rule: Rule;
  score: number;
  matchedFields: string[];
}

export interface SimilarityResult {
  rule: Rule;
  similarity: number;
  matchingAspects: string[];
}

// ============================================================================
// Manager Types
// ============================================================================

export interface LoadResult {
  rules: Rule[];
  sources: string[];
  errors: LoadError[];
}

export interface LoadError {
  file: string;
  message: string;
}

export interface SaveResult {
  success: boolean;
  path: string;
  error?: string;
}

export interface MergeResult {
  rules: Rule[];
  conflicts: MergeConflict[];
}

export interface MergeConflict {
  ruleId: string;
  sources: string[];
  resolution: 'auto' | 'manual';
  winner?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface RuleEvent {
  type: 'added' | 'updated' | 'deleted' | 'synced';
  ruleId: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type RuleMap = Map<string, Rule>;
export type CategoryMap = Map<string, Rule[]>;
export type TagIndex = Map<string, Set<string>>;

// ============================================================================
// Team Collaboration Types (Phase 1)
// ============================================================================

/** 팀 멤버 역할 */
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

/** 규칙 공개 범위 */
export type RuleVisibility = 'private' | 'team' | 'public';

/** 제안 타입 */
export type ProposalType = 'create' | 'update' | 'deprecate' | 'delete';

/** 제안 상태 */
export type ProposalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'merged' | 'cancelled';

/** 리뷰 결정 */
export type ReviewDecision = 'approve' | 'reject' | 'request_changes' | 'comment';

/** 동기화 방향 */
export type RemoteSyncDirection = 'push' | 'pull' | 'both';

// ============================================================================
// User & Auth Types
// ============================================================================

/** 사용자 정보 */
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** 인증 토큰 정보 */
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  tokenType: 'Bearer';
  scope?: string[];
}

/** 인증 상태 */
export interface AuthState {
  isAuthenticated: boolean;
  user?: User;
  token?: AuthToken;
  lastRefreshed?: string;
}

// ============================================================================
// Team Types
// ============================================================================

/** 팀 설정 */
export interface TeamSettings {
  /** 규칙 변경 시 승인 필요 여부 */
  requireApproval: boolean;

  /** 최소 승인자 수 */
  minApprovers: number;

  /** 자동 머지 활성화 */
  autoMerge: boolean;

  /** 기본 규칙 공개 범위 */
  defaultVisibility: RuleVisibility;

  /** 알림 설정 */
  notifications: {
    email: boolean;
    webhook?: string;
    slack?: string;
  };
}

/** 팀 멤버 */
export interface TeamMember {
  userId: string;
  user: User;
  role: TeamRole;
  joinedAt: string;
  invitedBy?: string;
}

/** 팀 */
export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  settings: TeamSettings;
  members?: TeamMember[];
  rulesCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** 팀 초대 */
export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

// ============================================================================
// Shared Rule Types
// ============================================================================

/** 규칙 협업 메트릭 */
export interface RuleCollaboration {
  /** 포크 횟수 */
  forkCount: number;

  /** 채택 횟수 */
  adoptionCount: number;

  /** 좋아요 수 */
  upvotes: number;

  /** 조회수 */
  viewCount: number;

  /** 평균 평점 (1-5) */
  rating?: number;

  /** 리뷰 수 */
  reviewCount?: number;
}

/** 규칙 원본 정보 (포크된 경우) */
export interface RuleOrigin {
  /** 원본 규칙 ID */
  ruleId: string;

  /** 원본 팀 ID */
  teamId: string;

  /** 포크 시점 버전 */
  forkedVersion: string;

  /** 포크 일시 */
  forkedAt: string;
}

/** 공유 규칙 (팀 협업용 확장) */
export interface SharedRule extends Rule {
  /** 소속 팀 ID */
  teamId: string;

  /** 공개 범위 */
  visibility: RuleVisibility;

  /** 협업 메트릭 */
  collaboration: RuleCollaboration;

  /** 원본 정보 (포크된 경우) */
  origin?: RuleOrigin;

  /** 발행 상태 */
  publishedAt?: string;

  /** 마켓플레이스 게시 여부 */
  listedInMarketplace?: boolean;
}

// ============================================================================
// Proposal Types
// ============================================================================

/** 제안 리뷰 */
export interface ProposalReview {
  id: string;
  proposalId: string;
  reviewerId: string;
  reviewer: User;
  decision: ReviewDecision;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

/** 제안 코멘트 */
export interface ProposalComment {
  id: string;
  proposalId: string;
  authorId: string;
  author: User;
  content: string;
  /** 인라인 코멘트인 경우 위치 */
  lineNumber?: number;
  field?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

/** 제안 변경 내역 */
export interface ProposalChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/** 규칙 제안 */
export interface Proposal {
  id: string;
  teamId: string;
  ruleId: string;
  type: ProposalType;
  status: ProposalStatus;
  title: string;
  description?: string;

  /** 제안된 규칙 내용 (create/update) */
  proposedRule?: Partial<SharedRule>;

  /** 기존 규칙 내용 (update/deprecate/delete) */
  currentRule?: SharedRule;

  /** 변경 내역 */
  changes?: ProposalChange[];

  /** 제안자 */
  authorId: string;
  author: User;

  /** 리뷰어 목록 */
  reviewers?: User[];

  /** 리뷰 */
  reviews: ProposalReview[];

  /** 코멘트 */
  comments?: ProposalComment[];

  /** 머지 조건 */
  mergeConditions?: {
    minApprovals: number;
    currentApprovals: number;
    requiredReviewers?: string[];
  };

  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  mergedBy?: string;
}

// ============================================================================
// Remote Sync Types
// ============================================================================

/** 원격 동기화 설정 */
export interface RemoteSyncConfig {
  /** 원격 서버 URL */
  serverUrl: string;

  /** 팀 ID */
  teamId?: string;

  /** 타임아웃 (ms) */
  timeout: number;

  /** 자동 동기화 활성화 */
  autoSync: boolean;

  /** 동기화 간격 (ms) */
  syncInterval?: number;

  /** 오프라인 큐 활성화 */
  offlineQueue: boolean;
}

/** 동기화 상태 */
export interface SyncState {
  /** 마지막 동기화 시각 */
  lastSyncAt?: string;

  /** 동기화 진행 중 여부 */
  isSyncing: boolean;

  /** 오프라인 여부 */
  isOffline: boolean;

  /** 대기 중인 변경 수 */
  pendingChanges: number;

  /** 마지막 에러 */
  lastError?: string;
}

/** 원격 동기화 결과 */
export interface RemoteSyncResult {
  success: boolean;
  direction: RemoteSyncDirection;

  /** 푸시된 규칙 */
  pushed?: {
    count: number;
    rules: string[];
  };

  /** 풀된 규칙 */
  pulled?: {
    count: number;
    rules: string[];
    newRules: string[];
    updatedRules: string[];
  };

  /** 충돌 */
  conflicts?: RemoteSyncConflict[];

  /** 오프라인 큐에 저장됨 */
  queued?: boolean;

  error?: string;
  timestamp: string;
}

/** 원격 동기화 충돌 */
export interface RemoteSyncConflict {
  ruleId: string;
  localRule: Rule;
  remoteRule: Rule;
  conflictFields: string[];
  resolution?: 'local' | 'remote' | 'manual';
  resolvedRule?: Rule;
}

/** 오프라인 큐 항목 */
export interface OfflineQueueItem {
  id: string;
  type: 'push' | 'pull' | 'delete';
  ruleId?: string;
  rule?: Rule;
  timestamp: string;
  retryCount: number;
  lastError?: string;
}

// ============================================================================
// Marketplace Types
// ============================================================================

/** 마켓플레이스 카테고리 */
export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ruleCount: number;
  iconUrl?: string;
}

/** 마켓플레이스 컬렉션 */
export interface MarketplaceCollection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  curatorId: string;
  curator: User;
  rules: SharedRule[];
  rulesCount: number;
  adoptionCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 마켓플레이스 검색 옵션 */
export interface MarketplaceSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  minRating?: number;
  sortBy?: 'popular' | 'recent' | 'rating' | 'adoptions';
  limit?: number;
  offset?: number;
}

/** 마켓플레이스 검색 결과 */
export interface MarketplaceSearchResult {
  rules: SharedRule[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Analytics Types
// ============================================================================

/** 규칙 분석 메트릭 */
export interface RuleAnalytics {
  ruleId: string;
  teamId: string;

  /** 위반 횟수 */
  violationCount: number;

  /** 자동 수정 횟수 */
  autoFixCount: number;

  /** 준수율 (0-100) */
  complianceRate: number;

  /** 일별 통계 */
  dailyStats: {
    date: string;
    violations: number;
    fixes: number;
  }[];

  /** 파일별 위반 */
  fileHotspots: {
    path: string;
    violations: number;
  }[];

  /** 시간대별 위반 */
  hourlyPattern: number[];

  period: {
    from: string;
    to: string;
  };
}

/** 팀 분석 메트릭 */
export interface TeamAnalytics {
  teamId: string;

  /** 전체 준수율 */
  overallComplianceRate: number;

  /** 활성 규칙 수 */
  activeRulesCount: number;

  /** 제안 통계 */
  proposalStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };

  /** 멤버별 기여도 */
  memberContributions: {
    userId: string;
    user: User;
    rulesCreated: number;
    proposalsSubmitted: number;
    reviewsCompleted: number;
    points: number;
  }[];

  /** 규칙 건강도 점수 (0-100) */
  healthScore: number;

  period: {
    from: string;
    to: string;
  };
}

// ============================================================================
// Notification Types
// ============================================================================

/** 알림 타입 */
export type NotificationType =
  | 'proposal_created'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'proposal_merged'
  | 'review_requested'
  | 'comment_added'
  | 'rule_adopted'
  | 'team_invite'
  | 'sync_conflict';

/** 알림 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  readAt?: string;
}
