# Monol Rulebook API 문서

REST API 레퍼런스 문서입니다.

## 기본 정보

- **Base URL**: `https://api.rulebook.monol.dev/api` (또는 자체 호스팅 URL)
- **인증**: Bearer Token (JWT)
- **Content-Type**: `application/json`

---

## 인증

### GitHub OAuth 로그인

```
GET /auth/github
```

GitHub OAuth 흐름을 시작합니다. 인증 완료 후 access token과 refresh token이 발급됩니다.

### 토큰 갱신

```
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "your-refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": 900
}
```

### 로그아웃

```
POST /auth/logout
Authorization: Bearer <token>
```

---

## 사용자

### 현재 사용자 정보

```
GET /users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user-uuid",
  "name": "Kent",
  "email": "kent@example.com",
  "avatar": "https://...",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 사용자 정보 수정

```
PUT /users/me
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Name",
  "bio": "My bio"
}
```

---

## 팀

### 팀 목록

```
GET /teams
Authorization: Bearer <token>
```

**Response:**
```json
{
  "teams": [
    {
      "id": "team-uuid",
      "name": "Frontend Team",
      "slug": "frontend-team",
      "role": "OWNER",
      "_count": {
        "members": 5,
        "rules": 20
      }
    }
  ]
}
```

### 팀 생성

```
POST /teams
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Team",
  "slug": "new-team",
  "description": "Team description",
  "isPublic": false
}
```

### 팀 상세

```
GET /teams/:slug
Authorization: Bearer <token>
```

### 팀 수정

```
PUT /teams/:slug
Authorization: Bearer <token>
```

### 팀 삭제

```
DELETE /teams/:slug
Authorization: Bearer <token>
```

### 팀 멤버 목록

```
GET /teams/:slug/members
Authorization: Bearer <token>
```

### 팀 멤버 초대

```
POST /teams/:slug/invite
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "MEMBER"
}
```

### 멤버 역할 변경

```
PUT /teams/:slug/members/:userId
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

### 멤버 제거

```
DELETE /teams/:slug/members/:userId
Authorization: Bearer <token>
```

---

## 규칙

### 규칙 목록

```
GET /teams/:slug/rules
Authorization: Bearer <token>
```

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `page` | number | 페이지 번호 (기본: 1) |
| `limit` | number | 페이지당 항목 수 (기본: 20) |
| `category` | string | 카테고리 필터 |
| `tags` | string | 태그 필터 (쉼표 구분) |
| `severity` | string | 심각도 필터 |
| `q` | string | 검색어 |
| `sort` | string | 정렬 필드 |
| `order` | string | 정렬 방향 (asc/desc) |

**Response:**
```json
{
  "rules": [
    {
      "id": "rule-uuid",
      "ruleId": "naming-001",
      "name": "변수명 규칙",
      "description": "...",
      "category": "code/naming",
      "tags": ["naming", "style"],
      "severity": "warning",
      "enabled": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### 규칙 생성

```
POST /teams/:slug/rules
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "ruleId": "naming-002",
  "name": "함수명 규칙",
  "description": "함수명은 동사로 시작합니다",
  "content": "## 함수명 규칙\n...",
  "category": "code/naming",
  "tags": ["naming", "functions"],
  "severity": "warning",
  "examples": {
    "good": ["getUserById()", "validateInput()"],
    "bad": ["user()", "input()"]
  }
}
```

### 규칙 상세

```
GET /teams/:slug/rules/:ruleId
Authorization: Bearer <token>
```

### 규칙 수정

```
PUT /teams/:slug/rules/:ruleId
Authorization: Bearer <token>
```

### 규칙 삭제

```
DELETE /teams/:slug/rules/:ruleId
Authorization: Bearer <token>
```

### 규칙 버전 이력

```
GET /teams/:slug/rules/:ruleId/versions
Authorization: Bearer <token>
```

---

## 제안 (Proposals)

### 제안 목록

```
GET /teams/:slug/proposals
Authorization: Bearer <token>
```

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `status` | string | 상태 필터 (DRAFT, PENDING, APPROVED, REJECTED, MERGED) |
| `type` | string | 타입 필터 (CREATE, UPDATE, DELETE) |

### 제안 생성

```
POST /teams/:slug/proposals
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "type": "CREATE",
  "title": "새 네이밍 규칙 추가",
  "description": "React 컴포넌트 네이밍 규칙입니다",
  "ruleData": {
    "ruleId": "naming-react-001",
    "name": "React 컴포넌트 네이밍",
    "category": "code/naming",
    "severity": "warning"
  }
}
```

### 제안 상세

```
GET /teams/:slug/proposals/:id
Authorization: Bearer <token>
```

### 제안 수정

```
PUT /teams/:slug/proposals/:id
Authorization: Bearer <token>
```

### 제안 제출

```
POST /teams/:slug/proposals/:id/submit
Authorization: Bearer <token>
```

### 제안 리뷰

```
POST /teams/:slug/proposals/:id/review
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "action": "APPROVE",
  "comment": "좋은 규칙입니다!"
}
```

**action 값:**
- `APPROVE`: 승인
- `REQUEST_CHANGES`: 변경 요청
- `REJECT`: 거절

### 제안 머지

```
POST /teams/:slug/proposals/:id/merge
Authorization: Bearer <token>
```

### 제안 취소

```
POST /teams/:slug/proposals/:id/cancel
Authorization: Bearer <token>
```

---

## 마켓플레이스

### 규칙 검색

```
GET /marketplace/rules
```

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `q` | string | 검색어 |
| `category` | string | 카테고리 |
| `tags` | string | 태그 (쉼표 구분) |
| `minRating` | number | 최소 평점 |
| `sort` | string | 정렬 (downloads, rating, recent, trending) |

### 규칙 상세

```
GET /marketplace/rules/:id
```

### 규칙 채택

```
POST /marketplace/rules/:id/adopt
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "teamId": "team-uuid",
  "customize": false
}
```

### 리뷰 작성

```
POST /marketplace/rules/:id/reviews
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "rating": 5,
  "content": "매우 유용한 규칙입니다!"
}
```

### 규칙 발행

```
POST /marketplace/publish
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "ruleId": "rule-uuid",
  "version": "1.0.0",
  "changelog": "첫 번째 릴리스",
  "license": "MIT"
}
```

### 트렌딩 규칙

```
GET /marketplace/trending
```

### 카테고리 목록

```
GET /marketplace/categories
```

---

## 분석

### 팀 통계

```
GET /teams/:slug/analytics
Authorization: Bearer <token>
```

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `startDate` | date | 시작일 |
| `endDate` | date | 종료일 |
| `groupBy` | string | 그룹화 (day, week, month) |

**Response:**
```json
{
  "compliance": {
    "rate": 85.5,
    "trend": 2.3
  },
  "rules": {
    "total": 50,
    "enabled": 45,
    "byCategory": {
      "code/naming": 15,
      "code/style": 10
    }
  },
  "activity": {
    "proposals": 12,
    "reviews": 45,
    "adoptions": 8
  },
  "timeline": [
    {
      "date": "2024-01-01",
      "compliance": 83,
      "violations": 5
    }
  ]
}
```

---

## 웹훅

### 웹훅 목록

```
GET /teams/:slug/webhooks
Authorization: Bearer <token>
```

### 웹훅 생성

```
POST /teams/:slug/webhooks
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "url": "https://example.com/webhook",
  "events": ["rule.created", "rule.updated", "proposal.merged"],
  "secret": "your-webhook-secret"
}
```

### 웹훅 이벤트

| 이벤트 | 설명 |
|--------|------|
| `rule.created` | 규칙 생성됨 |
| `rule.updated` | 규칙 수정됨 |
| `rule.deleted` | 규칙 삭제됨 |
| `proposal.created` | 제안 생성됨 |
| `proposal.submitted` | 제안 제출됨 |
| `proposal.reviewed` | 제안 리뷰됨 |
| `proposal.merged` | 제안 머지됨 |
| `member.joined` | 멤버 가입 |
| `member.left` | 멤버 탈퇴 |

---

## 에러 응답

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| `UNAUTHORIZED` | 401 | 인증 필요 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `VALIDATION_ERROR` | 400 | 입력값 오류 |
| `CONFLICT` | 409 | 중복/충돌 |
| `RATE_LIMIT_EXCEEDED` | 429 | 요청 제한 초과 |
| `INTERNAL_ERROR` | 500 | 서버 오류 |

---

## Rate Limiting

| 엔드포인트 | 제한 |
|------------|------|
| 일반 API | 100 요청/15분 |
| 인증 API | 10 요청/15분 |
| 웹훅 API | 60 요청/분 |

Rate limit 헤더:
- `X-RateLimit-Limit`: 총 허용량
- `X-RateLimit-Remaining`: 남은 횟수
- `X-RateLimit-Reset`: 리셋 시간 (Unix timestamp)
