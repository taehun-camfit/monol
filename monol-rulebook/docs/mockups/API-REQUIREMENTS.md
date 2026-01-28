# Rulebook 콘솔 API 요구사항

프로토타입 구현을 위한 플러그인과 서버 기능 정리입니다.

## 아키텍처 개요

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Console   │────▶│   API Server    │────▶│    Database     │
│   (Frontend)    │     │   (Backend)     │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
┌─────────────────┐     ┌─────────────────┐
│  Claude Plugin  │────▶│   Rules Files   │
│  (CLI 연동)     │     │   (YAML)        │
└─────────────────┘     └─────────────────┘
```

---

## 1. 인증 (Auth)

### 플러그인 필요 기능
- `getAuthToken()`: CLI에서 인증 토큰 가져오기
- `login()`: GitHub OAuth 인증 플로우 시작

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/auth/github` | GitHub OAuth 시작 |
| GET | `/auth/github/callback` | OAuth 콜백 |
| POST | `/auth/logout` | 로그아웃 |
| GET | `/auth/me` | 현재 사용자 정보 |

---

## 2. 사용자 (Users)

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/users/:id` | 사용자 정보 조회 |
| GET | `/users/:id/activity` | 사용자 활동 내역 |
| PATCH | `/users/:id` | 프로필 수정 |

---

## 3. 팀 (Teams)

### 플러그인 필요 기능
- `getCurrentTeam()`: 현재 선택된 팀
- `setCurrentTeam(teamId)`: 팀 전환

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/teams` | 내 팀 목록 |
| POST | `/teams` | 팀 생성 |
| GET | `/teams/:id` | 팀 정보 |
| PATCH | `/teams/:id` | 팀 정보 수정 |
| DELETE | `/teams/:id` | 팀 삭제 |
| GET | `/teams/:id/members` | 팀 멤버 목록 |
| POST | `/teams/:id/members` | 멤버 초대 |
| DELETE | `/teams/:id/members/:userId` | 멤버 제거 |
| POST | `/teams/join` | 초대 코드로 가입 |

---

## 4. 규칙 (Rules)

### 플러그인 필요 기능
- `loadLocalRules()`: 로컬 rules/ 폴더 읽기
- `saveRule(rule)`: 로컬에 규칙 저장
- `publishRule(ruleId, options)`: 서버에 규칙 발행
- `syncRules()`: 서버 ↔ 로컬 동기화

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/teams/:teamId/rules` | 규칙 목록 |
| POST | `/teams/:teamId/rules` | 규칙 생성 |
| GET | `/teams/:teamId/rules/:id` | 규칙 상세 |
| PATCH | `/teams/:teamId/rules/:id` | 규칙 수정 |
| DELETE | `/teams/:teamId/rules/:id` | 규칙 삭제 |
| POST | `/teams/:teamId/rules/:id/adopt` | 규칙 채택 |
| DELETE | `/teams/:teamId/rules/:id/adopt` | 채택 해제 |
| GET | `/teams/:teamId/rules/:id/history` | 변경 이력 |

### Query Parameters (목록 조회)
```
?category=code/naming
&severity=error,warning
&tags=naming,style
&status=active
&search=변수명
&sort=updated_at
&order=desc
&page=1
&limit=20
```

---

## 5. 제안 (Proposals)

### 플러그인 필요 기능
- `createProposal(ruleId, changes)`: 수정 제안 생성
- `getMyProposals()`: 내 제안 목록

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/teams/:teamId/proposals` | 제안 목록 |
| POST | `/teams/:teamId/proposals` | 제안 생성 |
| GET | `/teams/:teamId/proposals/:id` | 제안 상세 |
| PATCH | `/teams/:teamId/proposals/:id` | 제안 수정 |
| DELETE | `/teams/:teamId/proposals/:id` | 제안 삭제 |
| POST | `/teams/:teamId/proposals/:id/review` | 리뷰 제출 |
| POST | `/teams/:teamId/proposals/:id/merge` | 머지 |
| GET | `/teams/:teamId/proposals/:id/comments` | 댓글 목록 |
| POST | `/teams/:teamId/proposals/:id/comments` | 댓글 작성 |

### Review Body
```json
{
  "status": "approved" | "rejected" | "changes_requested",
  "comment": "리뷰 코멘트"
}
```

---

## 6. 마켓플레이스 (Marketplace)

### 플러그인 필요 기능
- `searchMarketplace(query)`: 공개 규칙 검색
- `adoptFromMarketplace(ruleId, options)`: 규칙 채택

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/marketplace/rules` | 공개 규칙 검색 |
| GET | `/marketplace/rules/:id` | 규칙 상세 |
| GET | `/marketplace/rules/:id/reviews` | 규칙 리뷰 |
| POST | `/marketplace/rules/:id/reviews` | 리뷰 작성 |
| GET | `/marketplace/collections` | 컬렉션 목록 |
| GET | `/marketplace/collections/:id` | 컬렉션 상세 |
| GET | `/marketplace/trending` | 인기 규칙 |
| GET | `/marketplace/categories` | 카테고리 목록 |

### Query Parameters
```
?category=security
&tags=api,error
&search=에러 핸들링
&sort=popular|recent|downloads|rating
&page=1
&limit=20
```

---

## 7. 분석 (Analytics)

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/teams/:teamId/analytics/overview` | 요약 통계 |
| GET | `/teams/:teamId/analytics/rules` | 규칙별 통계 |
| GET | `/teams/:teamId/analytics/members` | 멤버별 통계 |
| GET | `/teams/:teamId/analytics/activity` | 활동 로그 |
| GET | `/teams/:teamId/analytics/trends` | 트렌드 데이터 |

### Query Parameters
```
?period=7|30|90|all
&from=2025-01-01
&to=2025-01-31
```

### Response: Overview
```json
{
  "totalRules": 42,
  "totalChange": "+12%",
  "activeRules": 38,
  "activeChange": "+5%",
  "pendingProposals": 3,
  "contributors": 8,
  "severity": { "error": 12, "warning": 22, "info": 8 },
  "categories": [
    { "name": "Code Style", "count": 15 },
    { "name": "Security", "count": 10 }
  ],
  "tags": [
    { "name": "naming", "count": 18 },
    { "name": "style", "count": 15 }
  ]
}
```

---

## 8. 알림 (Notifications)

### 플러그인 필요 기능
- `getNotifications()`: 알림 목록 가져오기
- `showNotification(message)`: CLI 알림 표시

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/notifications` | 알림 목록 |
| PATCH | `/notifications/:id` | 읽음 처리 |
| POST | `/notifications/read-all` | 모두 읽음 |
| DELETE | `/notifications/:id` | 알림 삭제 |

### Notification Types
- `proposal_created`: 새 제안 생성됨
- `proposal_approved`: 제안 승인됨
- `proposal_rejected`: 제안 거절됨
- `proposal_merged`: 제안 머지됨
- `review_requested`: 리뷰 요청됨
- `comment_added`: 댓글 추가됨
- `rule_adopted`: 규칙 채택됨
- `mention`: 멘션됨

---

## 9. 토론 (Discussions)

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/teams/:teamId/rules/:ruleId/discussions` | 토론 목록 |
| POST | `/teams/:teamId/rules/:ruleId/discussions` | 댓글 작성 |
| PATCH | `/discussions/:id` | 댓글 수정 |
| DELETE | `/discussions/:id` | 댓글 삭제 |
| POST | `/discussions/:id/like` | 좋아요 |
| DELETE | `/discussions/:id/like` | 좋아요 취소 |
| POST | `/discussions/:id/replies` | 답글 작성 |

---

## 공통 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": { ... }
}
```

### 목록 응답
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "RULE_NOT_FOUND",
    "message": "규칙을 찾을 수 없습니다."
  }
}
```

---

## 데이터 스키마

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'member' | 'viewer';
  createdAt: Date;
}
```

### Team
```typescript
interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  ruleCount: number;
  createdAt: Date;
}
```

### Rule
```typescript
interface Rule {
  id: string;
  ruleId: string; // e.g., "naming-variable-001"
  name: string;
  description: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  tags: string[];
  content: string; // Markdown
  examples: {
    good: string[];
    bad: string[];
  };
  exceptions?: string[];
  author: User;
  version: string;
  status: 'draft' | 'active' | 'deprecated';
  adoptionRate?: number;
  likes: number;
  comments: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Proposal
```typescript
interface Proposal {
  id: string;
  type: 'create' | 'update' | 'delete';
  rule?: Rule;
  changes?: RuleChanges;
  author: User;
  reviewers: Reviewer[];
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Reviewer {
  user: User;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comment?: string;
  reviewedAt?: Date;
}
```

### Activity
```typescript
interface Activity {
  id: string;
  type: 'create' | 'update' | 'approve' | 'reject' | 'adopt' | 'comment';
  user: User;
  target: { type: string; id: string; name: string };
  detail?: string;
  createdAt: Date;
}
```

---

## 플러그인 ↔ 서버 연동

### 규칙 발행 플로우
```
1. 사용자: /rule-publish naming-001
2. 플러그인: loadLocalRules() → 규칙 읽기
3. 플러그인: POST /teams/:teamId/proposals → 제안 생성
4. 서버: 리뷰어에게 알림 전송
5. 웹 콘솔: 리뷰어가 승인
6. 서버: POST /proposals/:id/merge → 머지
7. 플러그인: syncRules() → 로컬 업데이트
```

### 규칙 채택 플로우
```
1. 사용자: /rule-adopt api-error-001 --from backend-team
2. 플러그인: GET /marketplace/rules/:id → 규칙 정보
3. 플러그인: POST /teams/:teamId/rules/:id/adopt → 채택
4. 플러그인: saveRule(rule) → 로컬 저장
5. 플러그인: /rule-sync → 플랫폼 동기화
```
