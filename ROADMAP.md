# Monol Family 통합 로드맵

> 마지막 업데이트: 2026-01-28

---

## 프로젝트 상태 요약

| 프로젝트 | 버전 | 상태 | 완성도 | 다음 마일스톤 |
|----------|------|------|--------|---------------|
| **monol-x** | v0.9.0 | ✅ 안정 | 100% | 유지보수 |
| **monol-channels** | v1.1.0 | ✅ 안정 | 100% | 유지보수 |
| **monol-rulebook** | v0.2.x | ✅ 안정 | 85% | v0.3.x 규칙 공유/배포 |
| **monol-plugin-scout** | v2.0.0 | ✅ 안정 | 80% | v2.1 UX 개선 |
| **monol-datastore** | v0.2.0 | ✅ 안정 | 90% | 플러그인 통합 |
| **monol-workbase** | v0.3.0 | ✅ 안정 | 65% | v0.4.0 스프린트 관리 |
| **monol-design** | v1.5.0 | ✅ 완료 | 100% | v2.0.0 React/Vue 라이브러리 |

---

## 우선순위별 다음 작업

### P0 - 즉시 (이번 주)

| 프로젝트 | 작업 | 예상 복잡도 |
|----------|------|-------------|
| ~~monol-workbase~~ | ~~v0.2.0 검색 & 필터링 (FTS5)~~ | ✅ 완료 |
| ~~monol-datastore~~ | ~~v0.2.0 마이그레이션 시스템~~ | ✅ 완료 |

### P1 - 단기 (2주 내) → P0 승격

| 프로젝트 | 작업 | 예상 복잡도 |
|----------|------|-------------|
| ~~monol-workbase~~ | ~~v0.3.0 분석 & ASCII 차트~~ | ✅ 완료 |
| ~~monol-rulebook~~ | ~~v0.2.x 마이그레이션 시스템~~ | ✅ 완료 |
| ~~monol-x~~ | ~~v0.9.0 진화 시스템 검증~~ | ✅ 완료 |

### P2 - 중기 (1개월 내) → P1 승격

| 프로젝트 | 작업 | 예상 복잡도 |
|----------|------|-------------|
| monol-workbase | v0.4.0 스프린트 관리 | 높 |
| monol-workbase | v0.4.5 의미론적 관계 | 높 |
| monol-plugin-scout | v2.1 무음/빈도 조절 | 중 |

### P3 - 장기 (분기 내)

| 프로젝트 | 작업 | 예상 복잡도 |
|----------|------|-------------|
| monol-workbase | v0.5.0-v1.0.0 자동화/리포팅/안정화 | 높 |
| monol-rulebook | v0.3.x 규칙 공유/배포 | 높 |
| monol-datastore | 플러그인 통합 (monol-logs 연동) | 중 |

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

**현재**: v0.2.x - 버전 관리 및 롤백 완료

```
Core CRUD       ████████████████████ 100%
Sync            ████████████████████ 100%
Versioning      ████████████████████ 100%
Migration       ████████████████░░░░ 80% (ID 마이그레이션 선택적)
Sharing         ░░░░░░░░░░░░░░░░░░░░ 0%
```

**v0.2.x 완료 (2026-01-28)**:
- [x] 규칙 버전 관리 시스템
- [x] `/rule-history` 이력 조회
- [x] 롤백 지원
- [ ] 레거시 규칙 ID 마이그레이션 (대부분 신규 ID 형식 사용 중)

**다음 (v0.3.x)**:
- [ ] 규칙 공유/배포 시스템
- [ ] 규칙 마켓플레이스

---

### monol-plugin-scout (플러그인 추천)

**현재**: v2.0.0 - 플러그인 스캔, 추천, 설치 완료

```
Discovery       ████████████████████ 100%
Recommendation  ████████████████████ 100%
UX              ████████████░░░░░░░░ 60%
Learning        ████████░░░░░░░░░░░░ 40%
```

**다음 (v2.1)**:
- [ ] `/scout quiet` 무음 모드
- [ ] 추천 빈도 조절
- [ ] 스마트 타이밍 (커밋 후 추천)

---

### monol-datastore (데이터 저장소)

**현재**: v0.2.0 - Core, Storage, Query, Migration 완료

```
Core            ████████████████████ 100%
Query           ████████████████████ 100%
FTS/TimeSeries  ████████████████████ 100%
Migration       ████████████████████ 100%
Plugin Integ    ░░░░░░░░░░░░░░░░░░░░ 0%
```

**v0.2.0 완료 (2026-01-28)**:
- [x] 스키마 diff 계산 (migrator.ts)
- [x] 마이그레이션 플래너 (migration-planner.ts)
- [x] `--dry-run` 지원
- [x] 롤백 (rollbackMigration)
- [x] FTS5 인덱스 자동 생성 (data-container.ts)

**다음**:
- [ ] 플러그인 통합 (monol-logs, monol-workbase 연동)

---

### monol-workbase (프로젝트 관리)

**현재**: v0.3.0 - 분석 & ASCII 차트 완료

```
Core CRUD       ████████████████████ 100%
Search          ████████████████████ 100%
Analytics       ████████████████████ 100%
Sprint          ░░░░░░░░░░░░░░░░░░░░ 0%
Relations       ░░░░░░░░░░░░░░░░░░░░ 0%
Automation      ░░░░░░░░░░░░░░░░░░░░ 0%
Reporting       ░░░░░░░░░░░░░░░░░░░░ 0%
```

**v0.2.0 완료 (2026-01-28)**:
- [x] FTS5 인덱스 추가 (Task, Issue, Feature - title+description)
- [x] searchTasks(), searchFeatures(), searchIssues(), searchAll()
- [x] autocomplete()

**v0.3.0 완료 (2026-01-28)**:
- [x] renderBurndownChart() - 번다운 차트
- [x] renderVelocityChart() - 벨로시티 차트
- [x] renderDistributionBar() - 분포 막대 그래프
- [x] renderProgressBar() - 진행률 바
- [x] renderSparkline() - 스파크라인 차트

**다음**:
- v0.4.0: 스프린트 관리
- v0.4.5: 의미론적 관계 (blocks, depends_on)
- v0.5.0: 자동화
- v0.6.0: 리포팅
- v1.0.0: 안정화

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

*다음 검토: 2026-02-04*
