# Rulebook 팀 협업 API 인터페이스

다른 모놀 플러그인/모듈에서 사용할 수 있는 API 인터페이스 정의입니다.

## 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    모놀 플러그인들                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ rulebook │  │  logs    │  │  scout   │  │  ...     │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
│       └─────────────┴──────┬──────┴─────────────┘           │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │              TeamCollaboration Interface                │ │
│  │  (이 인터페이스를 구현하면 모든 플러그인이 사용 가능)   │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   백엔드 서버 (별도 구현)     │
              │   - REST API                 │
              │   - WebSocket                │
              │   - PostgreSQL               │
              └──────────────────────────────┘
```

---

## 1. 핵심 타입 정의

### 1.1 팀/조직

```typescript
// 조직
interface Organization {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  createdAt: string;
  settings: OrganizationSettings;
}

interface OrganizationSettings {
  defaultVisibility: Visibility;
  allowPublicRules: boolean;
  requireApprovalForPublic: boolean;
}

// 팀
interface Team {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  settings: TeamSettings;
}

interface TeamSettings {
  requireApproval: boolean;
  minApprovers: number;
  autoMergeOnApproval: boolean;
  defaultReviewers: string[];
  syncPlatforms: PlatformType[];
}

// 팀 멤버
interface TeamMember {
  userId: string;
  teamId: string;
  role: TeamRole;
  permissions: TeamPermissions;
  joinedAt: string;
}

type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

interface TeamPermissions {
  canCreateRule: boolean;
  canEditRule: boolean;
  canDeleteRule: boolean;
  canApprove: boolean;
  canPublish: boolean;
  canInvite: boolean;
  canManageSettings: boolean;
}

type Visibility = 'private' | 'team' | 'organization' | 'public';
type PlatformType = 'cursor' | 'claude' | 'vscode';
```

### 1.2 공유 규칙

```typescript
// 공유 규칙 (기존 Rule 확장)
interface SharedRule extends Rule {
  // 팀 컨텍스트
  teamId: string;
  organizationId: string;
  visibility: Visibility;

  // 협업 메타데이터
  collaboration: CollaborationMeta;

  // 출처 (포크된 경우)
  origin?: RuleOrigin;

  // 발행 정보
  publishing?: PublishingInfo;
}

interface CollaborationMeta {
  forkCount: number;
  adoptionCount: number;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  viewCount: number;
  lastActivityAt: string;
}

interface RuleOrigin {
  ruleId: string;
  teamId: string;
  teamName: string;
  version: string;
  forkedAt: string;
  syncEnabled: boolean;  // 원본 업데이트 추적 여부
}

interface PublishingInfo {
  publishedAt: string;
  publishedBy: string;
  featured: boolean;
  verified: boolean;  // 공식 검증된 규칙
  downloads: number;
  rating: number;     // 1-5
  ratingCount: number;
}
```

### 1.3 제안 (Proposal)

```typescript
interface Proposal {
  id: string;
  teamId: string;
  ruleId?: string;  // 수정/폐기의 경우

  type: ProposalType;
  status: ProposalStatus;

  // 내용
  title: string;
  description: string;
  previousContent?: Rule;  // 수정의 경우
  proposedContent: Rule;

  // 워크플로우
  proposedBy: string;
  proposedAt: string;

  // 리뷰
  reviews: ProposalReview[];
  requiredApprovals: number;

  // 완료
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: ProposalResolution;
}

type ProposalType = 'create' | 'update' | 'deprecate' | 'delete';
type ProposalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'merged' | 'closed';
type ProposalResolution = 'merged' | 'rejected' | 'superseded' | 'withdrawn';

interface ProposalReview {
  id: string;
  proposalId: string;
  reviewerId: string;
  status: ReviewStatus;
  comment?: string;
  suggestedChanges?: Partial<Rule>;
  reviewedAt: string;
}

type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'rejected';
```

### 1.4 댓글/토론

```typescript
interface Comment {
  id: string;
  targetType: CommentTarget;
  targetId: string;  // ruleId 또는 proposalId

  parentId?: string;  // 대댓글
  authorId: string;
  content: string;

  // 상태
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;

  // 반응
  reactions: Reaction[];

  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
}

type CommentTarget = 'rule' | 'proposal';

interface Reaction {
  emoji: string;  // 👍, 👎, ❤️, 🎉, 😕, 🚀
  userId: string;
  createdAt: string;
}
```

### 1.5 활동/알림

```typescript
interface Activity {
  id: string;
  teamId: string;
  userId: string;

  type: ActivityType;
  entityType: EntityType;
  entityId: string;

  metadata: Record<string, unknown>;

  createdAt: string;
}

type ActivityType =
  | 'rule_created'
  | 'rule_updated'
  | 'rule_deprecated'
  | 'rule_adopted'
  | 'rule_forked'
  | 'proposal_created'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'proposal_merged'
  | 'comment_added'
  | 'member_joined'
  | 'member_left';

type EntityType = 'rule' | 'proposal' | 'team' | 'user';

interface Notification {
  id: string;
  userId: string;

  type: NotificationType;
  title: string;
  message: string;

  entityType: EntityType;
  entityId: string;

  read: boolean;
  readAt?: string;

  createdAt: string;
}

type NotificationType =
  | 'review_requested'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'comment_mention'
  | 'rule_adopted'
  | 'origin_updated'  // 포크한 원본이 업데이트됨
  | 'team_invite';
```

### 1.6 분석

```typescript
interface RuleAnalytics {
  ruleId: string;
  period: AnalyticsPeriod;

  views: number;
  uniqueViewers: number;
  adoptions: number;
  forks: number;
  upvotes: number;
  comments: number;

  adoptionTrend: TrendPoint[];
  viewTrend: TrendPoint[];
}

interface TeamAnalytics {
  teamId: string;
  period: AnalyticsPeriod;

  totalRules: number;
  activeRules: number;
  draftRules: number;
  deprecatedRules: number;

  totalProposals: number;
  pendingProposals: number;
  approvalRate: number;
  avgApprovalTime: number;  // hours

  memberActivity: MemberActivityStat[];
  rulesByCategory: CategoryStat[];
  rulesBySeverity: SeverityStat[];
  tagCloud: TagStat[];

  adoptionRate: number;
  trendData: TrendPoint[];
}

type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';

interface TrendPoint {
  date: string;
  value: number;
}

interface MemberActivityStat {
  userId: string;
  userName: string;
  proposals: number;
  approvals: number;
  comments: number;
  adoptionRate: number;
}

interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
}

interface SeverityStat {
  severity: Severity;
  count: number;
  percentage: number;
}

interface TagStat {
  tag: string;
  count: number;
}
```

---

## 2. API 인터페이스

### 2.1 TeamCollaborationClient

```typescript
/**
 * 팀 협업 기능을 제공하는 클라이언트 인터페이스
 * 백엔드 서버와 통신하는 구현체가 이 인터페이스를 구현
 */
interface TeamCollaborationClient {
  // 인증
  auth: AuthService;

  // 팀 관리
  teams: TeamService;

  // 규칙 관리
  rules: SharedRuleService;

  // 제안/승인
  proposals: ProposalService;

  // 마켓플레이스
  marketplace: MarketplaceService;

  // 댓글/토론
  comments: CommentService;

  // 알림
  notifications: NotificationService;

  // 분석
  analytics: AnalyticsService;

  // 실시간
  realtime: RealtimeService;
}
```

### 2.2 AuthService

```typescript
interface AuthService {
  // 로그인 (OAuth)
  login(provider: 'github' | 'google'): Promise<AuthResult>;

  // 로그아웃
  logout(): Promise<void>;

  // 현재 사용자
  getCurrentUser(): Promise<User | null>;

  // 토큰 갱신
  refreshToken(): Promise<string>;

  // 상태 확인
  isAuthenticated(): boolean;
}

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'github' | 'google';
  createdAt: string;
}
```

### 2.3 TeamService

```typescript
interface TeamService {
  // 팀 목록
  list(): Promise<Team[]>;

  // 팀 상세
  get(teamId: string): Promise<Team>;

  // 팀 생성
  create(data: CreateTeamInput): Promise<Team>;

  // 팀 수정
  update(teamId: string, data: UpdateTeamInput): Promise<Team>;

  // 팀 삭제
  delete(teamId: string): Promise<void>;

  // 멤버 관리
  getMembers(teamId: string): Promise<TeamMember[]>;
  inviteMember(teamId: string, email: string, role: TeamRole): Promise<void>;
  updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<void>;
  removeMember(teamId: string, userId: string): Promise<void>;

  // 초대 코드
  createInviteCode(teamId: string): Promise<string>;
  joinByInviteCode(code: string): Promise<Team>;
}

interface CreateTeamInput {
  name: string;
  slug: string;
  description?: string;
  settings?: Partial<TeamSettings>;
}

interface UpdateTeamInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  settings?: Partial<TeamSettings>;
}
```

### 2.4 SharedRuleService

```typescript
interface SharedRuleService {
  // 규칙 목록
  list(options?: RuleListOptions): Promise<PaginatedResult<SharedRule>>;

  // 규칙 상세
  get(ruleId: string): Promise<SharedRule>;

  // 규칙 검색
  search(query: string, options?: RuleSearchOptions): Promise<SearchResult<SharedRule>>;

  // 규칙 발행 (로컬 → 원격)
  publish(rule: Rule, options: PublishOptions): Promise<SharedRule>;

  // 규칙 수정 (제안 생성)
  proposeUpdate(ruleId: string, changes: Partial<Rule>, message: string): Promise<Proposal>;

  // 규칙 폐기 (제안 생성)
  proposeDeprecate(ruleId: string, reason: string, replacedBy?: string): Promise<Proposal>;

  // 규칙 채택 (원격 → 로컬)
  adopt(ruleId: string, options: AdoptOptions): Promise<Rule>;

  // 규칙 포크
  fork(ruleId: string): Promise<SharedRule>;

  // 투표
  upvote(ruleId: string): Promise<void>;
  downvote(ruleId: string): Promise<void>;
  removeVote(ruleId: string): Promise<void>;

  // 버전 히스토리
  getHistory(ruleId: string): Promise<RuleVersion[]>;

  // 원본 동기화 (포크된 규칙)
  syncWithOrigin(ruleId: string): Promise<SyncResult>;
}

interface RuleListOptions {
  teamId?: string;
  category?: string;
  severity?: Severity;
  tags?: string[];
  status?: RuleStatus;
  visibility?: Visibility;
  page?: number;
  limit?: number;
  sortBy?: 'created' | 'updated' | 'popularity' | 'adoption';
  sortOrder?: 'asc' | 'desc';
}

interface RuleSearchOptions extends RuleListOptions {
  includeDescription?: boolean;
  includeExamples?: boolean;
}

interface PublishOptions {
  visibility: Visibility;
  reviewers?: string[];
  message?: string;
  notifyTeam?: boolean;
}

interface AdoptOptions {
  mode: 'direct' | 'fork';
  targetPath?: string;  // 저장 위치
  syncWithOrigin?: boolean;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface SearchResult<T> extends PaginatedResult<T> {
  query: string;
  took: number;  // ms
}
```

### 2.5 ProposalService

```typescript
interface ProposalService {
  // 제안 목록
  list(options?: ProposalListOptions): Promise<PaginatedResult<Proposal>>;

  // 제안 상세
  get(proposalId: string): Promise<Proposal>;

  // 제안 생성
  create(data: CreateProposalInput): Promise<Proposal>;

  // 제안 수정 (draft 상태일 때만)
  update(proposalId: string, data: UpdateProposalInput): Promise<Proposal>;

  // 제안 제출 (draft → pending)
  submit(proposalId: string): Promise<Proposal>;

  // 제안 철회
  withdraw(proposalId: string): Promise<void>;

  // 리뷰 제출
  submitReview(proposalId: string, review: SubmitReviewInput): Promise<ProposalReview>;

  // 제안 머지 (승인 완료 후)
  merge(proposalId: string): Promise<SharedRule>;

  // 제안 닫기
  close(proposalId: string, reason: string): Promise<void>;

  // 리뷰어 지정
  assignReviewers(proposalId: string, reviewerIds: string[]): Promise<void>;

  // 내 리뷰 대기 목록
  getMyPendingReviews(): Promise<Proposal[]>;
}

interface ProposalListOptions {
  teamId?: string;
  status?: ProposalStatus;
  type?: ProposalType;
  proposedBy?: string;
  reviewerId?: string;
  page?: number;
  limit?: number;
}

interface CreateProposalInput {
  teamId: string;
  type: ProposalType;
  ruleId?: string;
  title: string;
  description: string;
  proposedContent: Rule;
  reviewerIds?: string[];
  asDraft?: boolean;
}

interface UpdateProposalInput {
  title?: string;
  description?: string;
  proposedContent?: Rule;
}

interface SubmitReviewInput {
  status: 'approved' | 'changes_requested' | 'rejected';
  comment?: string;
  suggestedChanges?: Partial<Rule>;
}
```

### 2.6 MarketplaceService

```typescript
interface MarketplaceService {
  // 공개 규칙 탐색
  browse(options?: BrowseOptions): Promise<PaginatedResult<SharedRule>>;

  // 인기 규칙
  getPopular(period?: AnalyticsPeriod, limit?: number): Promise<SharedRule[]>;

  // 최신 규칙
  getLatest(limit?: number): Promise<SharedRule[]>;

  // 추천 규칙 (사용자 기반)
  getRecommended(limit?: number): Promise<SharedRule[]>;

  // 추천 규칙 (컨텍스트 기반)
  getRecommendedForContext(context: ContextInfo): Promise<SharedRule[]>;

  // 카테고리 목록
  getCategories(): Promise<CategoryInfo[]>;

  // 인기 태그
  getPopularTags(limit?: number): Promise<TagStat[]>;

  // 규칙 평가
  rate(ruleId: string, rating: number): Promise<void>;

  // 규칙 신고
  report(ruleId: string, reason: string): Promise<void>;
}

interface BrowseOptions {
  category?: string;
  tags?: string[];
  minRating?: number;
  verified?: boolean;
  sortBy?: 'popular' | 'rating' | 'downloads' | 'recent';
  page?: number;
  limit?: number;
}

interface ContextInfo {
  fileTypes?: string[];
  projectType?: string;
  existingTags?: string[];
  existingCategories?: string[];
}

interface CategoryInfo {
  name: string;
  slug: string;
  description?: string;
  ruleCount: number;
  subcategories?: CategoryInfo[];
}
```

### 2.7 CommentService

```typescript
interface CommentService {
  // 댓글 목록
  list(targetType: CommentTarget, targetId: string): Promise<Comment[]>;

  // 댓글 작성
  create(data: CreateCommentInput): Promise<Comment>;

  // 댓글 수정
  update(commentId: string, content: string): Promise<Comment>;

  // 댓글 삭제
  delete(commentId: string): Promise<void>;

  // 댓글 해결됨 표시
  resolve(commentId: string): Promise<void>;
  unresolve(commentId: string): Promise<void>;

  // 리액션
  addReaction(commentId: string, emoji: string): Promise<void>;
  removeReaction(commentId: string, emoji: string): Promise<void>;
}

interface CreateCommentInput {
  targetType: CommentTarget;
  targetId: string;
  parentId?: string;
  content: string;
}
```

### 2.8 NotificationService

```typescript
interface NotificationService {
  // 알림 목록
  list(options?: NotificationListOptions): Promise<PaginatedResult<Notification>>;

  // 읽지 않은 알림 수
  getUnreadCount(): Promise<number>;

  // 읽음 처리
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(): Promise<void>;

  // 알림 삭제
  delete(notificationId: string): Promise<void>;

  // 알림 설정
  getSettings(): Promise<NotificationSettings>;
  updateSettings(settings: Partial<NotificationSettings>): Promise<void>;
}

interface NotificationListOptions {
  unreadOnly?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;

  reviewRequested: boolean;
  proposalResolved: boolean;
  commentMention: boolean;
  ruleAdopted: boolean;
  originUpdated: boolean;

  digestFrequency: 'realtime' | 'daily' | 'weekly';
}
```

### 2.9 AnalyticsService

```typescript
interface AnalyticsService {
  // 팀 분석
  getTeamAnalytics(teamId: string, period?: AnalyticsPeriod): Promise<TeamAnalytics>;

  // 규칙 분석
  getRuleAnalytics(ruleId: string, period?: AnalyticsPeriod): Promise<RuleAnalytics>;

  // 멤버 활동
  getMemberActivity(teamId: string, userId: string, period?: AnalyticsPeriod): Promise<MemberActivityStat>;

  // 활동 피드
  getActivityFeed(teamId: string, options?: ActivityFeedOptions): Promise<PaginatedResult<Activity>>;

  // 채택 보고서
  getAdoptionReport(teamId: string): Promise<AdoptionReport>;

  // 내보내기
  exportReport(teamId: string, format: 'json' | 'csv' | 'pdf'): Promise<Blob>;
}

interface ActivityFeedOptions {
  types?: ActivityType[];
  userId?: string;
  since?: string;
  page?: number;
  limit?: number;
}

interface AdoptionReport {
  teamId: string;
  generatedAt: string;

  summary: {
    totalRules: number;
    adoptedRules: number;
    adoptionRate: number;
  };

  byMember: Array<{
    userId: string;
    userName: string;
    adoptedCount: number;
    rate: number;
  }>;

  byCategory: Array<{
    category: string;
    adoptedCount: number;
    totalCount: number;
    rate: number;
  }>;

  lowAdoptionRules: SharedRule[];  // 채택률 낮은 규칙들
}
```

### 2.10 RealtimeService

```typescript
interface RealtimeService {
  // 연결
  connect(): Promise<void>;
  disconnect(): void;

  // 팀 채널 구독
  subscribeToTeam(teamId: string): void;
  unsubscribeFromTeam(teamId: string): void;

  // 규칙 구독 (상세 페이지용)
  subscribeToRule(ruleId: string): void;
  unsubscribeFromRule(ruleId: string): void;

  // 제안 구독
  subscribeToProposal(proposalId: string): void;
  unsubscribeFromProposal(proposalId: string): void;

  // 이벤트 리스너
  on(event: RealtimeEvent, callback: (data: unknown) => void): void;
  off(event: RealtimeEvent, callback: (data: unknown) => void): void;

  // 연결 상태
  isConnected(): boolean;
  onConnectionChange(callback: (connected: boolean) => void): void;
}

type RealtimeEvent =
  | 'rule:created'
  | 'rule:updated'
  | 'rule:adopted'
  | 'proposal:created'
  | 'proposal:reviewed'
  | 'proposal:merged'
  | 'comment:added'
  | 'notification:new'
  | 'member:joined'
  | 'member:left';
```

---

## 3. 구현 가이드

### 3.1 클라이언트 생성

```typescript
// 클라이언트 인스턴스 생성
import { createTeamCollaborationClient } from '@monol/rulebook-collab';

const client = createTeamCollaborationClient({
  baseUrl: 'https://api.monol.dev',
  // 또는 자체 서버
  // baseUrl: 'https://rules.mycompany.com/api',
});

// 인증
await client.auth.login('github');

// 팀 선택
const teams = await client.teams.list();
const team = teams[0];

// 규칙 발행
const rule = await loadLocalRule('naming-001');
const sharedRule = await client.rules.publish(rule, {
  visibility: 'team',
  reviewers: ['@jane', '@bob'],
  message: '네이밍 규칙 공유합니다',
});
```

### 3.2 로컬 통합

```typescript
// 로컬 RulebookManager와 연동
import { RulebookManager } from '@monol/rulebook';

class TeamRulebookManager extends RulebookManager {
  private client: TeamCollaborationClient;

  constructor(client: TeamCollaborationClient) {
    super();
    this.client = client;
  }

  // 원격 규칙 동기화
  async syncWithRemote(): Promise<SyncResult> {
    const localRules = await this.getAllRules();
    const remoteRules = await this.client.rules.list({ teamId: this.teamId });

    // 차이점 비교 및 동기화
    return this.mergeRules(localRules, remoteRules.items);
  }

  // 규칙 발행
  async publishRule(ruleId: string, options: PublishOptions): Promise<SharedRule> {
    const rule = await this.getRule(ruleId);
    return this.client.rules.publish(rule, options);
  }

  // 규칙 채택
  async adoptRule(ruleId: string, options: AdoptOptions): Promise<Rule> {
    const rule = await this.client.rules.adopt(ruleId, options);
    await this.saveRule(rule);
    return rule;
  }
}
```

---

## 4. 다른 모놀 플러그인 연동 예시

### 4.1 monol-logs 연동

```typescript
// 세션 로그에 규칙 활동 기록
import { SessionLogger } from '@monol/logs';

const logger = new SessionLogger();

// 규칙 채택 시 로깅
client.on('rule:adopted', (event) => {
  logger.log({
    type: 'rule_adopted',
    ruleId: event.ruleId,
    from: event.fromTeam,
    timestamp: new Date().toISOString(),
  });
});
```

### 4.2 monol-scout 연동

```typescript
// 플러그인 설치 시 관련 규칙 추천
import { PluginScout } from '@monol/scout';

const scout = new PluginScout();

// 플러그인에 맞는 규칙 추천
scout.on('plugin:installed', async (plugin) => {
  const recommendations = await client.marketplace.getRecommendedForContext({
    projectType: plugin.category,
    existingTags: plugin.tags,
  });

  console.log('추천 규칙:', recommendations);
});
```

---

## 5. 에러 처리

```typescript
// API 에러 타입
class TeamCollaborationError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;
}

type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

// 사용 예시
try {
  await client.rules.publish(rule, options);
} catch (error) {
  if (error instanceof TeamCollaborationError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        await client.auth.login('github');
        break;
      case 'CONFLICT':
        console.log('이미 존재하는 규칙입니다:', error.details);
        break;
      case 'RATE_LIMITED':
        console.log('잠시 후 다시 시도하세요');
        break;
    }
  }
}
```

---

## 다음 단계

1. **타입 패키지 생성**: `@monol/rulebook-types`
2. **클라이언트 구현**: `@monol/rulebook-client`
3. **서버 API 스펙**: OpenAPI/Swagger
4. **SDK 문서화**: API Reference
