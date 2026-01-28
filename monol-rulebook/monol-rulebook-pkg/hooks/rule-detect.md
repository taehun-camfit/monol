---
hook: rule-detect
description: 작업 중 규칙 감지 및 알림
events:
  - Edit
  - PreCommit
  - SessionEnd
---

# Rule Detect Hook

코드 작업 중 관련 규칙을 감지하고 알림하는 훅입니다.

## 라이브러리 연동

```typescript
import { RulebookManager, RuleSearch, quickSearchByTags } from './lib';

const manager = new RulebookManager(workspacePath);
const rules = await manager.loadRulesForPath(workspacePath);
const search = new RuleSearch(rules.rules);
```

## 이벤트별 동작

### Edit 이벤트

파일 편집 시 관련 규칙을 감지합니다.

#### 트리거 조건

```typescript
interface EditHookContext {
  filePath: string;
  oldContent: string;
  newContent: string;
  diff: string;
}
```

#### 감지 로직

```typescript
async function onEdit(context: EditHookContext) {
  const { filePath, newContent, diff } = context;

  // 1. 파일 타입 기반 규칙 검색
  const fileType = getFileType(filePath);
  const typeRules = search.searchByTags([fileType]);

  // 2. 변경 내용 패턴 감지
  const patterns = detectPatterns(diff);
  const patternRules = search.searchByTags(patterns);

  // 3. 결합 및 중복 제거
  const relevantRules = deduplicateRules([...typeRules, ...patternRules]);

  // 4. 알림 (최대 3개)
  if (relevantRules.length > 0) {
    showRuleSuggestions(relevantRules.slice(0, 3));
  }
}
```

#### 패턴 감지

```typescript
const PATTERNS = {
  naming: {
    snakeCase: /[a-z]+_[a-z]+/,
    pascalCaseVar: /const\s+[A-Z]/,
    lowerCaseClass: /class\s+[a-z]/,
  },
  style: {
    inconsistentIndent: /^( {2,})[^\s].*\n\1 [^\s]/m,
    trailingWhitespace: /\s+$/m,
  },
  workflow: {
    todoComment: /\/\/\s*(TODO|FIXME|HACK):/i,
    consoleLog: /console\.(log|debug|warn|error)/,
  },
};

function detectPatterns(code: string): string[] {
  const detected: string[] = [];

  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const [name, regex] of Object.entries(patterns)) {
      if (regex.test(code)) {
        detected.push(category);
        detected.push(name);
      }
    }
  }

  return [...new Set(detected)];
}
```

#### 출력 형식

```
💡 관련 규칙 발견:
  - naming-001: 변수명 규칙
    → snake_case 변수가 감지되었습니다

상세 확인: /rule naming-001
```

### PreCommit 이벤트 {#pre-commit}

커밋 전 규칙 위반을 체크합니다.

#### 트리거 조건

```typescript
interface PreCommitHookContext {
  message: string;
  stagedFiles: string[];
  diff: string;
}
```

#### 체크 로직

```typescript
async function onPreCommit(context: PreCommitHookContext) {
  const { message, stagedFiles, diff } = context;
  const violations: RuleViolation[] = [];

  // 1. 커밋 메시지 규칙 체크
  const commitRules = search.searchByTags(['commit', 'git']);
  for (const rule of commitRules) {
    if (!validateCommitMessage(message, rule)) {
      violations.push({
        rule,
        type: 'commit-message',
        message: `커밋 메시지가 규칙을 위반합니다: ${rule.name}`,
      });
    }
  }

  // 2. 변경 내용 규칙 체크
  const codePatterns = detectPatterns(diff);
  const codeRules = search.searchByTags(codePatterns);
  for (const rule of codeRules) {
    if (rule.severity === 'error' && hasViolation(diff, rule)) {
      violations.push({
        rule,
        type: 'code-pattern',
        message: `코드가 규칙을 위반합니다: ${rule.name}`,
      });
    }
  }

  // 3. 결과 출력
  if (violations.length > 0) {
    showViolations(violations);

    // error 레벨이면 경고 (config.blockOnError에 따라)
    const hasError = violations.some(v => v.rule.severity === 'error');
    if (hasError && config.blockOnError) {
      return { abort: true, message: 'Rule violations detected' };
    }
  }

  return { abort: false };
}
```

#### 커밋 메시지 검증

```typescript
function validateCommitMessage(message: string, rule: Rule): boolean {
  // Conventional Commits 형식 체크 (예시)
  if (rule.id === 'git-001') {
    const conventionalRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/;
    return conventionalRegex.test(message);
  }
  return true;
}
```

#### 출력 형식

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 규칙 체크 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 [error] git-001: 커밋 메시지 규칙
   현재: "fixed bug"
   권장: "fix(scope): description"

🟡 [warning] naming-001: 변수명 규칙
   파일: src/utils/helper.ts
   → snake_case 변수 감지

계속 커밋하시겠습니까? [y/N]
```

### SessionEnd 이벤트 {#sync-reminder}

세션 종료 시 동기화 상태를 체크합니다.

#### 트리거 조건

```typescript
interface SessionEndHookContext {
  sessionDuration: number;
  editedFiles: string[];
  commits: number;
}
```

#### 체크 로직

```typescript
async function onSessionEnd(context: SessionEndHookContext) {
  // 1. 규칙 변경 여부 확인
  const rulesChanged = context.editedFiles.some(f =>
    f.includes('rules/') && f.endsWith('.yaml')
  );

  if (!rulesChanged) return;

  // 2. 플랫폼 동기화 상태 확인
  const adapters = getAvailableAdapters();
  const outOfSync: string[] = [];

  for (const adapterName of adapters) {
    const adapter = getAdapter(adapterName, workspacePath);
    if (await isOutOfSync(adapter)) {
      outOfSync.push(adapterName);
    }
  }

  // 3. 동기화 제안
  if (outOfSync.length > 0) {
    showSyncReminder(outOfSync);
  }
}
```

#### 출력 형식

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 규칙 동기화 알림
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

규칙이 변경되었지만 아직 동기화되지 않은 플랫폼:
  - cursor (.cursorrules)
  - claude (.claude/rules/)

동기화 명령:
  /rule-sync all
```

## 설정

`.rulebook-config.yaml`에서 훅 설정:

```yaml
hooks:
  rule-detect:
    enabled: true
    events:
      edit:
        enabled: true
        minFileSize: 100
        maxSuggestions: 3
        cooldownMs: 5000
      preCommit:
        enabled: true
        blockOnError: false
        showWarnings: true
      sessionEnd:
        enabled: true
        checkInterval: daily

  # 무시할 파일 패턴
  ignore:
    - node_modules/**
    - dist/**
    - "*.min.js"
    - "*.generated.ts"
```

## 쿨다운 처리

같은 규칙에 대한 반복 알림 방지:

```typescript
const cooldownMap = new Map<string, number>();

function shouldShowSuggestion(ruleId: string): boolean {
  const now = Date.now();
  const lastShown = cooldownMap.get(ruleId) || 0;
  const cooldown = config.cooldownMs || 5000;

  if (now - lastShown < cooldown) {
    return false;
  }

  cooldownMap.set(ruleId, now);
  return true;
}
```

## 관련 파일

- `hooks.json` - 훅 정의
- `rule-discovery/SKILL.md` - 규칙 발견 스킬
- `/rule-sync` - 동기화 커맨드
