# Rulebook Mock API Server

프로토타입 테스트를 위한 목업 API 서버입니다.

## 설치 및 실행

```bash
cd docs/mockups/server
npm install
npm start
```

개발 모드 (파일 변경 시 자동 재시작):
```bash
npm run dev
```

서버는 `http://localhost:3001`에서 실행됩니다.

## API 엔드포인트

### 인증
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 팀
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/teams` | 팀 목록 |
| GET | `/api/teams/:id` | 팀 정보 |
| GET | `/api/teams/:id/members` | 팀 멤버 목록 |

### 규칙
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/teams/:teamId/rules` | 규칙 목록 |
| POST | `/api/teams/:teamId/rules` | 규칙 생성 |
| GET | `/api/teams/:teamId/rules/:id` | 규칙 상세 |
| PATCH | `/api/teams/:teamId/rules/:id` | 규칙 수정 |
| DELETE | `/api/teams/:teamId/rules/:id` | 규칙 삭제 |
| POST | `/api/teams/:teamId/rules/:id/adopt` | 규칙 채택 |
| GET | `/api/teams/:teamId/rules/:id/history` | 변경 이력 |

**Query Parameters (규칙 목록)**:
- `category`: 카테고리 필터 (e.g., `code/naming`)
- `severity`: 심각도 필터 (e.g., `error,warning`)
- `tags`: 태그 필터 (e.g., `naming,style`)
- `status`: 상태 필터 (`draft`, `active`, `deprecated`)
- `search`: 검색어
- `sort`: 정렬 필드
- `order`: 정렬 방향 (`asc`, `desc`)
- `page`: 페이지 번호
- `limit`: 페이지당 항목 수

### 제안 (Proposals)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/teams/:teamId/proposals` | 제안 목록 |
| POST | `/api/teams/:teamId/proposals` | 제안 생성 |
| GET | `/api/teams/:teamId/proposals/:id` | 제안 상세 |
| POST | `/api/teams/:teamId/proposals/:id/review` | 리뷰 제출 |
| POST | `/api/teams/:teamId/proposals/:id/merge` | 머지 |

### 마켓플레이스
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/marketplace/rules` | 공개 규칙 검색 |
| GET | `/api/marketplace/rules/:id` | 규칙 상세 |
| GET | `/api/marketplace/collections` | 컬렉션 목록 |
| GET | `/api/marketplace/collections/:id` | 컬렉션 상세 |
| GET | `/api/marketplace/trending` | 인기 규칙 |
| GET | `/api/marketplace/categories` | 카테고리 목록 |

### 분석
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/teams/:teamId/analytics/overview` | 요약 통계 |
| GET | `/api/teams/:teamId/analytics/activity` | 활동 로그 |
| GET | `/api/teams/:teamId/analytics/contributors` | 기여자 순위 |
| GET | `/api/teams/:teamId/analytics/tags` | 태그 통계 |

**Query Parameters**:
- `period`: 기간 (`7`, `30`, `90`)

### 토론
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/teams/:teamId/rules/:ruleId/discussions` | 댓글 목록 |
| POST | `/api/teams/:teamId/rules/:ruleId/discussions` | 댓글 작성 |
| POST | `/api/discussions/:id/replies` | 답글 작성 |
| POST | `/api/discussions/:id/like` | 좋아요 |

### 알림
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/notifications` | 알림 목록 |
| PATCH | `/api/notifications/:id` | 읽음 처리 |
| POST | `/api/notifications/read-all` | 모두 읽음 |

## 응답 형식

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

## 프로토타입에서 사용

프로토타입 HTML 파일에서 이 API를 사용하려면:

```javascript
const API_BASE = 'http://localhost:3001/api';

// 규칙 목록 가져오기
const response = await fetch(`${API_BASE}/teams/1/rules`);
const { data, pagination } = await response.json();

// 규칙 검색
const searchResponse = await fetch(`${API_BASE}/teams/1/rules?search=naming&severity=warning`);
```

## 데이터 수정

목업 데이터는 `data.js` 파일에 정의되어 있습니다.
서버 재시작 시 데이터가 초기화됩니다.
