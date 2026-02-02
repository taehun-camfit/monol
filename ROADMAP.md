# Monol Family 통합 로드맵

> 마지막 업데이트: 2026-02-03

---

## 프로젝트 상태 요약

| 프로젝트 | 버전 | 상태 | 완성도 | 다음 마일스톤 |
|----------|------|------|--------|---------------|
| **monol-x** | v0.9.0 | ✅ 안정 | 100% | 유지보수 |
| **monol-channels** | v1.1.0 | ✅ 안정 | 100% | 유지보수 |
| **monol-rulebook** | v1.5.x | ✅ 안정 | 100% | v2.0.x 엔터프라이즈 |
| **monol-plugin-scout** | v2.5.0 | ✅ 안정 | 100% | v3.0 학습 시스템 |
| **monol-datastore** | v1.0.0 | ✅ 안정 | 100% | v1.1.x 엔터프라이즈 |
| **monol-workbase** | v1.3.0 | ✅ 안정 | 100% | v2.0.0 AI 기능 |
| **monol-design** | v1.5.0 | ✅ 완료 | 100% | v2.0.0 React/Vue 라이브러리 |

---

## 우선순위별 다음 작업

### P0~P3 - 완료

모든 핵심 작업이 완료되었습니다.

| 우선순위 | 프로젝트 | 작업 | 상태 |
|----------|----------|------|------|
| P0 | monol-workbase | v0.2.0 검색 & 필터링 (FTS5) | ✅ 완료 |
| P0 | monol-datastore | v0.2.0 마이그레이션 시스템 | ✅ 완료 |
| P1 | monol-workbase | v0.3.0 분석 & ASCII 차트 | ✅ 완료 |
| P1 | monol-rulebook | v0.2.x 마이그레이션 시스템 | ✅ 완료 |
| P1 | monol-x | v0.9.0 진화 시스템 검증 | ✅ 완료 |
| P2 | monol-workbase | v0.4.0~v1.3.0 스프린트/관계/자동화/협업/외부연동 | ✅ 완료 |
| P2 | monol-plugin-scout | v2.1~v2.5 무음/빈도/콘솔/학습 | ✅ 완료 |
| P3 | monol-rulebook | v0.3.x~v1.5.x 공유/팀/마켓플레이스/실시간 | ✅ 완료 |
| P3 | monol-datastore | v0.3.0~v1.0.0 플러그인 통합/Analytics | ✅ 완료 |

### 다음 목표 (v2.0.x)

| 프로젝트 | 작업 | 우선순위 |
|----------|------|----------|
| monol-workbase | v2.0.0 AI 기반 기능 (시간 추정, 우선순위 추천) | P1 |
| monol-rulebook | v2.0.x 엔터프라이즈 기능 | P2 |
| monol-datastore | v1.1.x 엔터프라이즈 기능 | P2 |
| monol-design | v2.0.0 React/Vue 라이브러리 | P2 |

---

## 프로젝트별 상세

### monol-x (세션 관리 코어)

**현재**: v0.9.0 - 진화 시스템 검증 완료

```
Core        ████████████████████ 100%
Modules     ████████████████████ 100%
Dashboard   ████████████████████ 100%
Evolution   ████████████████████ 100%
```

**v0.9.0 완료 (2026-01-28)**:
- [x] 10+ 세션 실전 검증
- [x] 자동 진화 트리거 확인 (3가지 조건 구현)
- [x] debugger-core, documenter-core 에이전트

**상태**: 유지보수 모드. 새 기능 요청 시 확장.

---

### monol-channels (협업 채널)

**현재**: v1.1.0 - Phase 12 완료, 기능 완성

```
Core DM/Group   ████████████████████ 100%
Discuss/Flow    ████████████████████ 100%
Workflow        ████████████████████ 100%
Analytics       ████████████████████ 100%
Integrations    ████████████████████ 100%
Dashboard       ████████████████████ 100%
```

**상태**: 유지보수 모드. 새 기능 요청 시 확장.

---

### monol-rulebook (규칙 관리)

**현재**: v1.5.x - 실시간 기능 완료

```
Core CRUD       ████████████████████ 100%
Sync            ████████████████████ 100%
Versioning      ████████████████████ 100%
Migration       ████████████████████ 100%
Sharing         ████████████████████ 100%
Team/Backend    ████████████████████ 100%
Marketplace     ████████████████████ 100%
Real-time       ████████████████████ 100%
```

**v1.5.x 완료 (2026-02-03)**:
- [x] 규칙 버전 관리 시스템
- [x] `/rule-history` 이력 조회 및 롤백
- [x] 규칙 공유/배포 시스템
- [x] 팀 협업 및 백엔드 연동
- [x] 규칙 마켓플레이스
- [x] 실시간 동기화

**상태**: v1.5.x 완료. 다음: v2.0.x 엔터프라이즈 기능

---

### monol-plugin-scout (플러그인 추천)

**현재**: v2.5.0 - 학습 시스템 완료

```
Discovery       ████████████████████ 100%
Recommendation  ████████████████████ 100%
UX              ████████████████████ 100%
Learning        ████████████████████ 100%
```

**v2.5.0 완료 (2026-02-03)**:
- [x] `/scout quiet` 무음 모드 - 추천 알림 완전 비활성화
- [x] `/scout frequency` 추천 빈도 조절 - 세션/일일 제한
- [x] `/scout timing` 스마트 타이밍 - 커밋/PR 후 추천
- [x] rejection-learner.sh - 거절 학습 (쿨다운, 영구 차단)
- [x] profile-learner.sh - 프로필 학습 (선호도, 활동 패턴)
- [x] trend-learner.sh - 트렌드 학습 (인기도, 카테고리 변화)
- [x] ai-recommender.sh - AI 기반 추천 (코드/의존성 분석)
- [x] team-learner.sh - 협업 학습 (팀 정책, 온보딩)

**상태**: v2.5.0 완료. 다음: v3.0 엔터프라이즈 기능

---

### monol-datastore (데이터 저장소)

**현재**: v1.0.0 - Analytics & Reporting 완료

```
Core            ████████████████████ 100%
Query           ████████████████████ 100%
FTS/TimeSeries  ████████████████████ 100%
Migration       ████████████████████ 100%
Plugin Integ    ████████████████████ 100%
Performance     ████████████████████ 100%
Backup/PITR     ████████████████████ 100%
Real-time Sync  ████████████████████ 100%
Multi-tenancy   ████████████████████ 100%
Analytics       ████████████████████ 100%
```

**v1.0.0 완료 (2026-02-03)**:
- [x] 스키마 diff 및 마이그레이션 플래너
- [x] FTS5 인덱스 자동 생성
- [x] 플러그인 통합 (monol-logs, monol-workbase 연동)
- [x] 성능 최적화 및 캐싱
- [x] 백업 및 PITR (Point-in-Time Recovery)
- [x] 실시간 동기화
- [x] 멀티 테넌시 지원
- [x] Analytics & Reporting

**상태**: v1.0.0 완료. 다음: v1.1.x 엔터프라이즈 기능

---

### monol-workbase (프로젝트 관리)

**현재**: v1.3.0 - 외부 연동 완료

```
Core CRUD       ████████████████████ 100%
Search          ████████████████████ 100%
Analytics       ████████████████████ 100%
Sprint          ████████████████████ 100%
Relations       ████████████████████ 100%
Automation      ████████████████████ 100%
Reporting       ████████████████████ 100%
Collaboration   ████████████████████ 100%
Templates       ████████████████████ 100%
Integration     ████████████████████ 100%
```

**v0.2.0~v0.4.5 완료**:
- [x] FTS5 검색 및 자동완성
- [x] ASCII 차트 (Burndown, Velocity, Distribution)
- [x] Sprint 관리 및 통계
- [x] TaskRelation 의존성 그래프

**v0.5.0~v1.0.0 완료**:
- [x] Automation - 상태 자동 변경, 체크리스트
- [x] Reporting - 프로젝트/스프린트/주간 리포트

**v1.1.0~v1.3.0 완료 (2026-02-03)**:
- [x] Collaboration - 댓글, 활동 로그, 멘션
- [x] Templates - 태스크/프로젝트 템플릿, 반복 태스크
- [x] Integration - GitHub, Jira, Linear, CSV 연동

**상태**: v1.3.0 완료. 다음: v2.0.0 AI 기반 기능 (시간 추정, 우선순위 추천)

---

### monol-design (디자인 시스템)

**현재**: v1.5.0 - Advanced Components 완료

- [x] 기본 컴포넌트: Button, Card, Badge, Input, Table
- [x] 확장 컴포넌트: Tooltip, Popover, Skeleton, Accordion
- [x] 폼 컴포넌트: Checkbox, Radio, Switch, Date/Time Picker
- [x] 아이콘 시스템: 크기, 색상, 애니메이션, 컨테이너
- [x] 고급 컴포넌트: Tree View, Steps, Carousel, Timeline
- [x] 반응형 및 애니메이션 지원

**상태**: v1.5.0 완료. 다음: v2.0.0 React/Vue 라이브러리

---

## 의존성 관계

```
monol-datastore ──────────┬──► monol-workbase
                          │
                          ├──► monol-logs (예정)
                          │
                          └──► monol-rulebook (예정)

monol-x ──────────────────┬──► 모든 플러그인 (세션 관리)
                          │
                          └──► monol-channels (팀 협업)

monol-design ─────────────────► 모든 웹 UI
```

---

## 홀딩 중인 작업

| 작업 | 이유 | 재개 조건 |
|------|------|-----------|
| 콘솔 목업 | 구현 우선 | 핵심 기능 완료 후 |
| TUI 대시보드 | 웹 대시보드 있음 | 요청 시 |
| Slack/Discord 연동 | 우선순위 낮음 | 팀 요청 시 |

---

## 규칙

### 작업 시작 전
1. 이 로드맵 확인
2. 해당 프로젝트 ROADMAP.md 확인
3. 진행 중인 작업 충돌 확인

### 작업 완료 후
1. 프로젝트 ROADMAP.md 업데이트
2. 이 마스터 로드맵 업데이트
3. 버전 히스토리 기록

---

*다음 검토: 2026-02-10*
