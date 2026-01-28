# Monol Rulebook 기술 문서

플러그인의 아키텍처, 내부 구조, 확장 방법을 설명하는 기술 문서입니다.

## 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [디렉토리 구조](#디렉토리-구조)
3. [핵심 라이브러리](#핵심-라이브러리)
4. [플러그인 인터페이스](#플러그인-인터페이스)
5. [데이터 흐름](#데이터-흐름)
6. [확장 가이드](#확장-가이드)
7. [배포 설정](#배포-설정)
8. [업그레이드 가이드](#업그레이드-가이드)

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code Plugin Layer                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │Commands │  │ Skills  │  │  Hooks  │  │ Agents  │            │
│  │  (.md)  │  │ (.md)   │  │ (.json) │  │  (.md)  │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │            │            │            │                  │
│       └────────────┴─────┬──────┴────────────┘                  │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                     Core Library Layer                           │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │              RulebookManager (규칙 로드/저장)               │   │
│  │  - loadRulesForPath()  - saveRule()  - mergeRules()      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│  ┌───────────────┐  ┌────┴────────┐  ┌────────────────────┐    │
│  │  RuleSearch   │  │ Versioning  │  │   SyncManager      │    │
│  │  (검색/인덱싱) │  │ (버전관리)  │  │   (동기화)         │    │
│  └───────────────┘  └─────────────┘  └─────────┬──────────┘    │
│                                                 │                │
│                           ┌─────────────────────┼───────────┐   │
│                           │    Platform Adapters            │   │
│                           │  ┌──────────┐  ┌──────────┐     │   │
│                           │  │ Cursor   │  │  Claude  │     │   │
│                           │  └──────────┘  └──────────┘     │   │
│                           └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                     Storage Layer                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  rules/                                                   │   │
│  │  ├── .rulebook-config.yaml                               │   │
│  │  ├── code/*.yaml                                          │   │
│  │  ├── workflow/*.yaml                                      │   │
│  │  └── .history/*.yaml                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 디렉토리 구조

```
monol-rulebook/
├── .claude-plugin/                 # 마켓플레이스 배포 설정
│   ├── marketplace.json            # 마켓플레이스 메타데이터
│   └── plugin.json                 # npm source용 플러그인 정의
│
├── monol-rulebook-pkg/             # 플러그인 패키지 (directory source용)
│   ├── plugin.json                 # 플러그인 정의
│   ├── commands/                   # 슬래시 커맨드 (5개)
│   │   ├── rule.md
│   │   ├── rule-add.md
│   │   ├── rule-search.md
│   │   ├── rule-sync.md
│   │   └── rule-history.md
│   ├── skills/                     # 스킬
│   │   └── rule-discovery/
│   │       └── SKILL.md
│   ├── hooks/                      # 훅
│   │   ├── hooks.json
│   │   └── rule-detect.md
│   └── agents/                     # 에이전트
│       └── rule-curator.md
│
├── foundations/                    # 핵심 라이브러리
│   └── logic/lib/
│       ├── index.ts                # 진입점 (exports)
│       ├── types.ts                # 타입 정의 (~500줄)
│       ├── rulebook-manager.ts     # 규칙 관리
│       ├── rule-search.ts          # 검색 엔진
│       ├── rule-versioning.ts      # 버전 관리
│       ├── sync-manager.ts         # 동기화 관리
│       ├── errors.ts               # 에러 타입
│       └── adapters/               # 플랫폼 어댑터
│           ├── platform-adapter.ts
│           ├── cursor-adapter.ts
│           └── claude-adapter.ts
│
├── rules/                          # 규칙 저장소 (예시)
│   ├── .rulebook-config.yaml
│   ├── code/
│   ├── workflow/
│   └── .history/
│
├── dist/                           # 컴파일 결과
├── bin/                            # CLI 진입점
│   └── sync.js
├── package.json
└── tsconfig.json
```

### 주요 디렉토리 역할

| 디렉토리 | 역할 | 수정 시기 |
|----------|------|----------|
| `.claude-plugin/` | npm 배포 설정 | 버전 업데이트 시 |
| `monol-rulebook-pkg/` | 플러그인 UI | 커맨드/스킬 추가 시 |
| `foundations/logic/lib/` | 비즈니스 로직 | 기능 추가/수정 시 |
| `rules/` | 예시 규칙 | 규칙 예시 추가 시 |

---

## 핵심 라이브러리

### types.ts - 타입 정의

#### 핵심 타입

```typescript
// 심각도
type Severity = 'error' | 'warning' | 'info';

// 적용 범위
type Scope = 'global' | 'project' | 'package';

// 규칙 상태
type RuleStatus = 'draft' | 'active' | 'deprecated';

// 환경
type Environment = 'development' | 'staging' | 'production';
```

#### Rule 인터페이스 (핵심)

```typescript
interface Rule {
  // 필수 필드
  id: string;                  // 고유 ID (예: naming-variable-001)
  name: string;                // 규칙 이름
  description: string;         // 상세 설명
  category: string;            // 카테고리 (예: code/naming)
  tags: string[];              // 태그 배열
  severity: Severity;          // 심각도

  // 선택 필드
  examples?: RuleExamples;     // Good/Bad 예시
  exceptions?: string[];       // 예외 상황
  related?: string[];          // 관련 규칙 ID
  created: string;             // 생성일 (ISO 8601)
  updated: string;             // 수정일
  scope?: Scope;               // 적용 범위
  enabled?: boolean;           // 활성화 여부 (기본: true)

  // 고급 필드
  metadata?: RuleMetadata;     // 버전, 작성자, 상태
  dependencies?: RuleDependencies; // 의존성
  conditions?: RuleCondition;  // 조건부 적용
  platforms?: PlatformConfig;  // 플랫폼별 설정
}
```

#### 메타데이터 타입

```typescript
interface RuleMetadata {
  version: string;             // semver (예: 1.2.0)
  status: RuleStatus;
  author?: string;
  reviewers?: string[];
  changelog: ChangelogEntry[];
}

interface ChangelogEntry {
  version: string;
  date: string;
  author: string;
  changes: string;
  snapshot?: Rule;             // 롤백용 스냅샷
}

interface RuleDependencies {
  requires?: string[];         // 선행 규칙
  conflicts?: string[];        // 충돌 규칙
  extends?: string;            // 상속할 부모 규칙
  replacedBy?: string;         // 대체 규칙 (deprecated 시)
}
```

---

### RulebookManager - 규칙 관리

#### 주요 메서드

```typescript
class RulebookManager {
  // 규칙 로드 (계층적)
  async loadRulesForPath(targetPath: string): Promise<Rule[]>;

  // 설정 로드
  loadConfig(path: string): RulebookConfig;

  // 디렉토리에서 규칙 로드
  async loadRulesFromDirectory(path: string): Promise<Rule[]>;

  // 규칙 저장
  async saveRule(rule: Rule): Promise<void>;

  // 규칙 조회
  getRule(id: string): Rule | undefined;
  getRulesByCategory(category: string): Rule[];
  getAllRules(): Rule[];

  // 규칙 병합
  mergeRules(rules: Rule[][], strategy: MergeStrategy): Rule[];

  // 의존성 검증
  validateDependencies(): ValidationResult;
  buildDependencyGraph(): DependencyGraph;
}
```

#### 계층적 규칙 로드 로직

```typescript
async loadRulesForPath(targetPath: string): Promise<Rule[]> {
  // 1. 설정 파일 로드
  const config = this.loadConfig(targetPath);

  // 2. 상위 계층 규칙 로드 (priority 순)
  const inheritedRules = [];
  for (const source of config.inheritance.sort(byPriority)) {
    const rules = await this.loadRulesFromDirectory(source.path);
    inheritedRules.push(rules);
  }

  // 3. 현재 경로 규칙 로드
  const localRules = await this.loadRulesFromDirectory(targetPath);

  // 4. 규칙 병합
  const merged = this.mergeRules(
    [...inheritedRules, localRules],
    config.hierarchy.mergeStrategy
  );

  // 5. 의존성 검증
  this.validateDependencies(merged);

  return merged;
}
```

---

### RuleSearch - 검색 엔진

#### 인덱스 구조

```typescript
class RuleSearch {
  private tagIndex: Map<string, Set<string>>;      // tag → ruleIds
  private keywordIndex: Map<string, Set<string>>; // keyword → ruleIds

  constructor(rules: Rule[]) {
    this.buildIndex(rules);
  }
}
```

#### 주요 메서드

```typescript
class RuleSearch {
  // 태그 검색
  searchByTags(tags: string[], matchAll?: boolean): Rule[];

  // 키워드 검색 (name, description, examples)
  searchByKeyword(keyword: string): Rule[];

  // 복합 검색
  search(options: SearchOptions): SearchResult[];

  // 유사 규칙 찾기 (0~1 유사도)
  findSimilar(rule: Rule, threshold: number): Rule[];

  // 파일에 적용 가능한 규칙
  getRulesForFile(filePath: string): Rule[];

  // 환경별 규칙
  getRulesForEnvironment(env: Environment): Rule[];
}
```

#### 유사도 계산

```typescript
// Jaccard 유사도 기반
function calculateSimilarity(rule1: Rule, rule2: Rule): number {
  const tags1 = new Set(rule1.tags);
  const tags2 = new Set(rule2.tags);

  const intersection = new Set([...tags1].filter(t => tags2.has(t)));
  const union = new Set([...tags1, ...tags2]);

  return intersection.size / union.size;
}
```

---

### RuleVersioning - 버전 관리

#### 버전 증가 규칙

| 변경 유형 | 버전 | 예시 |
|-----------|------|------|
| 규칙 의미 변경 | Major | 1.0.0 → 2.0.0 |
| 예시/예외 추가 | Minor | 1.0.0 → 1.1.0 |
| 오타/문구 개선 | Patch | 1.0.0 → 1.0.1 |

#### 주요 메서드

```typescript
class RuleVersioning {
  // 새 버전 생성
  createVersion(rule: Rule, changes: string, author: string): Rule;

  // 이력 조회
  getHistory(ruleId: string): ChangelogEntry[];

  // 버전 비교
  diff(ruleId: string, fromVersion: string, toVersion: string): Diff;

  // 롤백
  rollback(ruleId: string, version: string): Rule;
}
```

#### 히스토리 저장 형식

```yaml
# rules/.history/naming-variable-001.yaml
- version: "1.0.0"
  date: "2025-01-18T00:00:00Z"
  author: "@kent"
  changes: "초기 버전"
  snapshot:
    id: naming-variable-001
    name: 변수명 규칙
    # ... 전체 규칙 스냅샷

- version: "1.1.0"
  date: "2025-01-19T00:00:00Z"
  author: "@kent"
  changes: "TypeScript 관련 예시 추가"
  snapshot: { ... }
```

---

### SyncManager - 동기화 관리

#### 동기화 방향

```typescript
type SyncDirection = 'push' | 'pull' | 'both';
```

#### 주요 메서드

```typescript
class SyncManager {
  // 플랫폼에서 가져오기
  pullFromPlatform(platform: string): Promise<Rule[]>;

  // 동기화 실행
  sync(platform: string, direction: SyncDirection): Promise<SyncResult>;

  // 차이점 비교
  diff(platform: string): Promise<SyncDiffResult>;

  // 충돌 해결
  resolveConflicts(
    conflicts: SyncConflict[],
    strategy: ConflictStrategy
  ): Rule[];
}
```

#### 충돌 해결 전략

```typescript
type ConflictStrategy =
  | 'local-wins'   // 로컬 값 유지
  | 'remote-wins'  // 원격 값 적용
  | 'manual';      // 사용자 선택

interface SyncConflict {
  ruleId: string;
  localVersion: string;
  remoteVersion: string;
  fields: string[];        // 충돌 필드 목록
  resolution?: ConflictStrategy;
}
```

---

### Platform Adapters - 플랫폼 어댑터

#### 기본 어댑터

```typescript
abstract class BasePlatformAdapter {
  abstract read(): Promise<string>;
  abstract format(rules: Rule[]): string;
  abstract write(content: string): Promise<void>;

  async sync(rules: Rule[]): Promise<void> {
    const content = this.format(rules);
    await this.write(content);
  }
}
```

#### CursorAdapter

```typescript
class CursorAdapter extends BasePlatformAdapter {
  private outputPath: string = '.cursorrules';

  format(rules: Rule[]): string {
    return rulesToMarkdownDocument(rules);
  }
}
```

#### ClaudeAdapter

```typescript
class ClaudeAdapter extends BasePlatformAdapter {
  private outputDir: string = '.claude/rules';

  format(rules: Rule[]): string {
    return rulesToDirectives(rules);  // MDX 형식
  }
}
```

#### 어댑터 등록

```typescript
// 새 어댑터 등록
registerAdapter('vscode', VSCodeAdapter);

// 어댑터 사용
const adapter = getAdapter('cursor', basePath);
await adapter.sync(rules);

// 사용 가능한 어댑터 목록
const adapters = getAvailableAdapters(); // ['cursor', 'claude', ...]
```

---

## 플러그인 인터페이스

### Commands (.md 파일)

#### Frontmatter 형식

```yaml
---
description: 커맨드 설명
argument-hint: "[args]"
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash]
---
```

#### 커맨드 본문 구조

```markdown
# 커맨드명

## 개요
커맨드 설명

## 사용법
인자 및 옵션 설명

## 동작
1. 단계별 동작 설명
2. ...

## 라이브러리 연동
```typescript
import { RulebookManager } from './foundations/logic/lib';
```

## 출력 형식
예상 출력 형식
```

### Skills

#### SKILL.md 구조

```markdown
# 스킬명

**유형:** Proactive | Reactive

## 트리거
- file_edit
- code_review

## 동작
1. 감지 로직
2. 규칙 검색
3. 제안 출력

## 설정
```yaml
discovery:
  enabled: true
```
```

### Hooks

#### hooks.json 형식

```json
{
  "hooks": [
    {
      "name": "hook-name",
      "event": "Edit",
      "handler": "rule-detect.md",
      "settings": {
        "minFileSize": 100,
        "cooldownMs": 5000
      }
    }
  ]
}
```

#### 지원 이벤트

| 이벤트 | 발생 시점 |
|--------|----------|
| `Edit` | 파일 편집 시 |
| `PreCommit` | 커밋 전 |
| `SessionEnd` | 세션 종료 시 |

### Agents

#### 에이전트 템플릿

```markdown
# 에이전트명

**유형:** Session Template

## 역할
에이전트의 목적 설명

## 워크플로우
1. 분석 단계
2. 처리 단계
3. 출력 단계

## 허용 도구
- Read, Glob, Grep
- Edit, Write
- AskUserQuestion
```

---

## 데이터 흐름

### 규칙 로드 흐름

```
사용자: /rule list
    │
    ▼
Command Handler (rule.md)
    │
    ├─→ RulebookManager.loadRulesForPath()
    │       │
    │       ├─→ loadConfig() → .rulebook-config.yaml
    │       │
    │       ├─→ loadRulesFromDirectory() × N
    │       │       └─→ YAML 파싱 → Rule[]
    │       │
    │       └─→ mergeRules() → 최종 Rule[]
    │
    ▼
출력: 규칙 목록
```

### 동기화 흐름

```
사용자: /rule-sync cursor
    │
    ▼
Command Handler (rule-sync.md)
    │
    ├─→ RulebookManager.loadRulesForPath()
    │
    ├─→ SyncManager.diff('cursor')
    │       └─→ CursorAdapter.read() → 현재 .cursorrules
    │
    ├─→ 차이점 표시 / 충돌 해결
    │
    └─→ CursorAdapter.sync(rules)
            ├─→ format() → Markdown
            └─→ write() → .cursorrules
```

### 검색 흐름

```
사용자: /rule-search naming --tags style
    │
    ▼
Command Handler (rule-search.md)
    │
    ├─→ RulebookManager.loadRulesForPath()
    │
    └─→ RuleSearch
            ├─→ searchByKeyword('naming')
            ├─→ searchByTags(['style'])
            └─→ 결과 교집합 → SearchResult[]
```

---

## 확장 가이드

### 새 플랫폼 어댑터 추가

1. **어댑터 클래스 생성**

```typescript
// foundations/logic/lib/adapters/vscode-adapter.ts
import { BasePlatformAdapter, Rule } from '../';

export class VSCodeAdapter extends BasePlatformAdapter {
  private outputPath: string;

  constructor(basePath: string) {
    super();
    this.outputPath = path.join(basePath, '.vscode/settings.json');
  }

  async read(): Promise<string> {
    // 기존 설정 읽기
  }

  format(rules: Rule[]): string {
    // VS Code 형식으로 변환
    return JSON.stringify({ 'editor.rules': rules }, null, 2);
  }

  async write(content: string): Promise<void> {
    // 설정 파일에 병합
  }
}
```

2. **어댑터 등록**

```typescript
// foundations/logic/lib/adapters/platform-adapter.ts
import { VSCodeAdapter } from './vscode-adapter';

registerAdapter('vscode', VSCodeAdapter);
```

3. **설정 추가**

```yaml
# rules/.rulebook-config.yaml
platforms:
  vscode:
    enabled: true
    outputFile: .vscode/settings.json
```

4. **커맨드 업데이트**

```markdown
<!-- monol-rulebook-pkg/commands/rule-sync.md -->
지원 플랫폼: cursor, claude, vscode, all
```

### 새 커맨드 추가

1. **커맨드 파일 생성**

```markdown
<!-- monol-rulebook-pkg/commands/rule-export.md -->
---
description: 규칙을 다양한 형식으로 내보내기
argument-hint: "<format> [options]"
allowed-tools: [Read, Write, Glob]
---

# /rule-export

## 사용법
/rule-export json --output rules.json
/rule-export markdown --output RULES.md

## 동작
1. 규칙 로드
2. 형식 변환
3. 파일 저장
```

2. **라이브러리에 로직 추가** (필요시)

```typescript
// foundations/logic/lib/exporters/json-exporter.ts
export function exportToJson(rules: Rule[]): string {
  return JSON.stringify(rules, null, 2);
}
```

### 새 훅 추가

1. **hooks.json 수정**

```json
{
  "hooks": [
    {
      "name": "rule-validate-on-save",
      "event": "Write",
      "handler": "rule-validate.md",
      "settings": {
        "patterns": ["rules/**/*.yaml"]
      }
    }
  ]
}
```

2. **핸들러 생성**

```markdown
<!-- monol-rulebook-pkg/hooks/rule-validate.md -->
## 트리거
Write 이벤트 (rules/**/*.yaml)

## 동작
1. YAML 문법 검증
2. 필수 필드 확인
3. 중복 ID 검사
```

---

## 배포 설정

### npm 패키지 구조

```json
// package.json
{
  "name": "monol-rulebook",
  "version": "0.3.5",
  "main": "dist/foundations/logic/lib/index.js",
  "types": "dist/foundations/logic/lib/index.d.ts",
  "bin": {
    "monol-rulebook": "dist/bin/sync.js"
  },
  "files": [
    "dist",
    "rules",
    "scripts",
    ".claude-plugin",
    "monol-rulebook-pkg"
  ]
}
```

### 배포 체크리스트

1. **버전 업데이트**
   - `package.json` → version
   - `.claude-plugin/plugin.json` → version
   - `monol-rulebook-pkg/plugin.json` → version

2. **빌드**
   ```bash
   npm run build
   ```

3. **테스트**
   ```bash
   npm test
   ```

4. **배포**
   ```bash
   npm publish
   ```

### plugin.json 듀얼 설정

npm source와 directory source 모두 지원하려면 plugin.json이 2개 필요:

```
.claude-plugin/plugin.json     # npm source용 (경로: monol-rulebook-pkg/...)
monol-rulebook-pkg/plugin.json # directory source용 (경로: commands/...)
```

---

## 업그레이드 가이드

### v0.3.x → v0.4.x 마이그레이션 계획

#### 예정된 변경사항

1. **규칙 ID 체계 변경**
   - 기존: `naming-001`
   - 신규: `naming-variable-001`

2. **마이그레이션 맵**
   ```yaml
   # rules/.migrations/001-id-restructure.yaml
   mappings:
     - from: naming-001
       to: naming-variable-001
     - from: style-001
       to: style-format-001
   ```

3. **영향받는 파일**
   - `rules/**/*.yaml` (id, related 필드)
   - `rules/.history/*.yaml`
   - `.cursorrules`
   - `.claude/rules/`

#### 마이그레이션 방법

```bash
# 상태 확인
monol-rulebook migrate status

# 미리보기
monol-rulebook migrate --dry-run

# 실행
monol-rulebook migrate

# 롤백 (필요시)
monol-rulebook migrate rollback
```

### 주요 코드 수정 포인트

| 변경 사항 | 수정 파일 |
|-----------|----------|
| 새 규칙 필드 추가 | `types.ts` |
| 검색 로직 변경 | `rule-search.ts` |
| 새 플랫폼 지원 | `adapters/` |
| 버전 정책 변경 | `rule-versioning.ts` |
| 새 커맨드 | `monol-rulebook-pkg/commands/` |

### 하위 호환성 유지

```typescript
// 레거시 규칙 감지
function isLegacyRule(rule: Rule): boolean {
  return !rule.id.includes('-', rule.id.indexOf('-') + 1);
}

// 레거시 → 신규 변환
function migrateRuleId(oldId: string): string {
  const mappings = loadMigrationMappings();
  return mappings[oldId] || oldId;
}
```

---

## 디버깅

### 로그 활성화

```bash
DEBUG=monol-rulebook:* monol-rulebook sync
```

### 공통 문제 해결

| 문제 | 해결 방법 |
|------|----------|
| 규칙 로드 실패 | YAML 문법 확인, 필수 필드 확인 |
| 동기화 충돌 | `--diff`로 차이점 확인 후 해결 |
| 플러그인 미인식 | settings.json 확인, 플러그인 재활성화 |
| 순환 의존성 | `validateDependencies()` 결과 확인 |

### 테스트

```bash
# 전체 테스트
npm test

# 특정 모듈 테스트
npm test -- --grep "RulebookManager"

# 커버리지
npm run test:coverage
```

---

## 참고 자료

- [사용자 가이드](./USER-GUIDE.md)
- [로드맵](./ROADMAP.md)
- [Claude Code 플러그인 문서](https://docs.anthropic.com/claude-code/plugins)
