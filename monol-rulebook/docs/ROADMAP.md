# Monol Rulebook Roadmap

## 완료된 기능

### v0.1.x - 기본 기능 ✅
- [x] 기본 규칙 로드/저장
- [x] Cursor/Claude 플랫폼 동기화
- [x] 계층적 규칙 병합 (글로벌 → 프로젝트 → 로컬)
- [x] CLI 도구 (`monol-rulebook init/sync`)
- [x] Claude Code 플러그인 배포 (`/rule`, `/rule-add`, `/rule-search`, `/rule-sync`)

### v0.2.x - 마이그레이션 시스템 ✅
- [x] 레거시 규칙 형식 자동 감지
- [x] 마이그레이션 맵 정의 스키마
- [x] ID 체계 변경 (`{주제}-{번호}` → `{주제}-{세부}-{번호}`)
- [x] CLI migrate 명령어
- [x] 롤백 지원

### v0.3.x - 규칙 공유 및 배포 ✅
- [x] 규칙 패키지 퍼블리싱 (npm)
- [x] 팀 공유 규칙 저장소
- [x] 규칙 import/export
- [x] `/rule-team` 커맨드
- [x] `/rule-publish` 커맨드
- [x] `/rule-adopt` 커맨드

### v0.4.x - 팀 협업 기반 (Phase 1) ✅
- [x] 타입 정의 (Team, SharedRule, Proposal)
- [x] AuthManager (토큰 관리)
- [x] RemoteSyncService
- [x] OfflineQueueManager
- [x] ConflictResolver
- [x] DeltaSync
- [x] LocalCache
- [x] SyncStatusIndicator

### v0.5.x - 백엔드 API (Phase 2) ✅
- [x] Prisma 스키마 설계
- [x] Express 서버 셋업
- [x] JWT 인증 미들웨어
- [x] GitHub OAuth
- [x] Users/Teams/Rules/Proposals CRUD
- [x] Zod 검증 스키마
- [x] Redis 캐시 레이어
- [x] Rate limiter
- [x] Health check 엔드포인트
- [x] Structured logging
- [x] Dockerfile / docker-compose
- [x] CI/CD 파이프라인

### v0.6.x - 웹 대시보드 (Phase 3) ✅
- [x] Next.js 14 프로젝트 셋업
- [x] shadcn/ui 컴포넌트 라이브러리
- [x] NextAuth.js 인증
- [x] TanStack Query (React Query) 연동
- [x] 레이아웃 컴포넌트 (Header, Sidebar)
- [x] 팀 대시보드 페이지
- [x] 규칙 목록/상세 페이지
- [x] 통계/분석 페이지
- [x] 설정 페이지
- [x] 에러 바운더리
- [x] 스켈레톤 로딩
- [x] 토스트 알림

### v0.7.x - 승인 워크플로우 (Phase 4) ✅
- [x] Proposal 상태 머신 (draft → pending → approved/rejected → merged)
- [x] 제안 생성/상세 API
- [x] 리뷰 API (승인/거절/변경요청)
- [x] 머지 로직
- [x] 리뷰어 자동 할당 알고리즘
- [x] 알림 서비스 (이메일/웹훅)
- [x] 제안 생성/상세 UI
- [x] 리뷰 UI (인라인 코멘트)
- [x] Diff 뷰 컴포넌트
- [x] 알림 배지

### v0.8.x - 시각화 + 분석 (Phase 5) ✅
- [x] 분석 데이터 스키마
- [x] 데이터 수집 서비스 (AnalyticsCollector)
- [x] 집계 서비스
- [x] 분석 API
- [x] 분석 캐시 레이어
- [x] 차트 컴포넌트 (Bar, Line, Pie, Area)
- [x] 준수율 게이지
- [x] 트렌드 차트
- [x] 태그 클라우드
- [x] 히트맵
- [x] 리더보드
- [x] 리포트 생성기 (PDF/CSV)

### v0.9.x - 마켓플레이스 (Phase 6) ✅
- [x] 마켓플레이스 스키마
- [x] 규칙 발행 API
- [x] 검색 API (풀텍스트, 필터, 정렬)
- [x] 채택 API
- [x] 즐겨찾기 API
- [x] 평점/리뷰 API
- [x] 버전 관리 API
- [x] 검색 인덱싱 서비스
- [x] 트렌딩 계산 서비스
- [x] 추천 엔진 (협업 필터링)
- [x] 마켓플레이스 페이지
- [x] 규칙 카드 컴포넌트
- [x] 카테고리 브라우저
- [x] 검색 필터 UI
- [x] 리뷰 시스템 UI
- [x] 트렌딩 섹션
- [x] 규칙 상세 페이지

### v1.0.x - 안정화 및 배포 준비 ✅
- [x] 통합 테스트 작성 (API 유닛 테스트)
- [x] E2E 테스트 (Playwright)
- [x] 성능 최적화 (캐시, 페이지네이션)
- [x] 보안 강화 (미들웨어, Rate Limiting, 입력 검증)
- [x] 문서화 완료 (USER-GUIDE, TECHNICAL, API)
- [x] 프로덕션 배포 설정 (Docker, CI/CD, Nginx)

### v1.1.x - GitHub 연동 강화 ✅
- [x] GitHub API 클라이언트
- [x] PR 웹훅 핸들러
- [x] PR ↔ 제안 동기화
- [x] GitHub Actions 연동 (rulebook-sync action)
- [x] 규칙 위반 시 PR 코멘트

### v1.2.x - AI 인사이트 ✅
- [x] AI 분석 서비스 (OpenAI 연동)
- [x] 위반 패턴 자동 감지
- [x] 개선 제안 생성
- [x] 리스크 예측
- [x] 추천 엔진 (협업 필터링, 카테고리 매칭)

### v1.3.x - 관리자 기능 ✅
- [x] 관리자 대시보드 통계
- [x] 사용자/팀 관리 API
- [x] 감사 로그 API
- [x] 신고 관리 시스템
- [x] 시스템 설정 관리
- [x] 헬스 체크 상세

### v1.4.x - 국제화 및 접근성 ✅
- [x] i18n 설정 (lib/i18n)
- [x] 한/영 번역 파일 (messages/ko.json, en.json)
- [x] 날짜/숫자 로컬라이즈
- [x] 접근성 텍스트 추가

### v1.5.x - 실시간 기능 ✅
- [x] WebSocket 서버 (ws)
- [x] 채널 기반 구독 시스템
- [x] 실시간 알림
- [x] 팀 프레즌스 (온라인 상태)
- [x] 실시간 브로드캐스트

---

## 예정된 기능

### v2.0.x - 엔터프라이즈 기능
- [ ] SSO 지원 (SAML, OIDC)
- [ ] 조직 관리 (다중 팀 계층)
- [ ] 역할 기반 접근 제어 (RBAC) 확장
- [ ] 감사 로그 내보내기
- [ ] 사용량 분석 대시보드

### v2.1.x - 고급 분석
- [ ] 커스텀 리포트 빌더
- [ ] 슬랙/Teams 통합
- [ ] 이메일 다이제스트
- [ ] 목표/OKR 연동

### v2.2.x - IDE 통합 확장
- [ ] VSCode 확장
- [ ] JetBrains IDE 플러그인
- [ ] Neovim 플러그인

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  CLI Plugin        │  Web Dashboard      │  IDE Extensions      │
│  (Claude Code)     │  (Next.js 14)       │  (VSCode, Cursor)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  REST API (Express.js)                                           │
│  - Auth (JWT + GitHub OAuth)                                     │
│  - Teams / Rules / Proposals / Marketplace                       │
│  - Analytics / Notifications / Reviews                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  ProposalStateMachine │ MergeService │ NotificationService      │
│  TrendingService      │ RecommendationService │ SearchIndex     │
│  AnalyticsCollector   │ ReviewerAssignment                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Prisma) │ Redis (Cache) │ File Storage             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 기술 스택

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis
- **Auth**: JWT + GitHub OAuth
- **Validation**: Zod

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **State**: TanStack Query
- **Auth**: NextAuth.js
- **Charts**: Recharts

### Infrastructure
- **Container**: Docker
- **Orchestration**: Kubernetes (optional)
- **CI/CD**: GitHub Actions

---

## 기여 가이드

### 규칙 추가
```bash
# 대화형으로 새 규칙 추가
/rule-add

# 플랫폼에 동기화
/rule-sync cursor
```

### 개발 환경 설정
```bash
# 의존성 설치
npm install

# 개발 서버 실행
cd packages/api && npm run dev
cd packages/web && npm run dev

# Docker로 전체 스택 실행
docker-compose up
```

### 테스트
```bash
npm test
npm run test:e2e
```

---

## 라이선스

MIT License
