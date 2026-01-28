---
skill: rule-discovery
description: 코드 작업 중 관련 규칙 자동 발견
proactive: true
triggers:
  - file_edit
  - code_review
  - commit_prepare
---

# Rule Discovery Skill

코드 작업 중 관련 규칙을 자동으로 발견하고 제안하는 프로액티브 스킬입니다.

## 개요

이 스킬은 다음 상황에서 자동으로 활성화됩니다:
- 파일 편집 중 관련 코드 패턴 감지
- 코드 리뷰 시 규칙 위반 가능성 체크
- 커밋 준비 시 관련 규칙 알림

## 라이브러리 연동

```typescript
import { RulebookManager, RuleSearch, quickSearchByTags } from './lib';

const manager = new RulebookManager(workspacePath);
const rules = await manager.loadRulesForPath(workspacePath);
const search = new RuleSearch(rules.rules);
```

## 트리거 조건

### 1. 파일 편집 트리거

파일 타입에 따라 관련 규칙 검색:

```typescript
function getTriggersForFile(filePath: string): string[] {
  const ext = path.extname(filePath);
  const triggers: string[] = [];

  // 확장자 기반 트리거
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    triggers.push('javascript', 'typescript', 'code');
  }
  if (['.css', '.scss', '.less'].includes(ext)) {
    triggers.push('style', 'css');
  }

  // 파일명 기반 트리거
  const basename = path.basename(filePath);
  if (basename.includes('test') || basename.includes('spec')) {
    triggers.push('testing');
  }
  if (basename === '.gitignore' || basename.endsWith('.yaml')) {
    triggers.push('config');
  }

  return triggers;
}
```

### 2. 코드 패턴 감지

코드 내용에서 패턴 감지:

```typescript
const patterns = [
  { regex: /function\s+[A-Z]/, tags: ['naming', 'functions'] },
  { regex: /const\s+[A-Z_]+\s*=/, tags: ['naming', 'constants'] },
  { regex: /class\s+[a-z]/, tags: ['naming', 'classes'] },
  { regex: /TODO:|FIXME:|HACK:/, tags: ['comments', 'technical-debt'] },
  { regex: /console\.(log|error|warn)/, tags: ['debugging', 'logging'] },
  { regex: /throw new Error\(/, tags: ['error-handling'] },
  { regex: /async\s+function|await\s+/, tags: ['async', 'promises'] },
];

function detectPatterns(code: string): string[] {
  const detectedTags = new Set<string>();
  for (const pattern of patterns) {
    if (pattern.regex.test(code)) {
      pattern.tags.forEach(t => detectedTags.add(t));
    }
  }
  return Array.from(detectedTags);
}
```

### 3. 커밋 메시지 트리거

커밋 준비 시:

```typescript
function getCommitTriggers(message: string, files: string[]): string[] {
  const triggers = ['git', 'commit'];

  // 파일 타입 분석
  const hasTests = files.some(f => f.includes('test') || f.includes('spec'));
  const hasConfig = files.some(f => f.endsWith('.json') || f.endsWith('.yaml'));

  if (hasTests) triggers.push('testing');
  if (hasConfig) triggers.push('config');

  return triggers;
}
```

## 출력 형식

### 인라인 알림 (비침습적)

```
💡 관련 규칙: naming-001 (변수명 규칙)
   → /rule naming-001 로 상세 확인
```

### 경고 알림

```
⚠️ 규칙 확인 필요: git-001 (커밋 메시지 규칙)
   현재: "fixed bug"
   권장: "fix(component): resolve issue description"
```

### 제안 모음

여러 규칙이 관련된 경우:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 관련 규칙 3개 발견
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. naming-001: 변수명 규칙 [warning]
   → 파일에서 snake_case 변수 감지

2. style-001: 코드 포맷팅 규칙 [warning]
   → 들여쓰기 불일치 감지

3. error-001: 에러 처리 규칙 [info]
   → try-catch 블록 없이 async 함수 감지

💡 `/rule-search` 로 더 많은 규칙 검색
```

## 프로액티브 동작

### 파일 저장 시

```typescript
async function onFileSave(filePath: string, content: string) {
  const triggers = [
    ...getTriggersForFile(filePath),
    ...detectPatterns(content),
  ];

  if (triggers.length === 0) return;

  const rules = quickSearchByTags(allRules, triggers);
  if (rules.length > 0) {
    showInlineHint(rules);
  }
}
```

### 코드 리뷰 시

```typescript
async function onCodeReview(diff: string) {
  const addedLines = extractAddedLines(diff);
  const patterns = detectPatterns(addedLines.join('\n'));

  const rules = search.search({
    tags: patterns,
    enabledOnly: true,
  });

  if (rules.length > 0) {
    showReviewSuggestions(rules);
  }
}
```

### 커밋 전

```typescript
async function onPreCommit(message: string, files: string[]) {
  const triggers = getCommitTriggers(message, files);
  const rules = quickSearchByTags(allRules, triggers);

  // 커밋 메시지 규칙 체크
  const commitRules = rules.filter(r => r.tags.includes('commit'));
  for (const rule of commitRules) {
    if (!validateAgainstRule(message, rule)) {
      showWarning(rule);
    }
  }
}
```

## 설정

`.rulebook-config.yaml`에서 프로액티브 동작 설정:

```yaml
discovery:
  enabled: true

  # 트리거 설정
  triggers:
    file_save: true
    code_review: true
    pre_commit: true

  # 출력 레벨
  verbosity: normal  # quiet | normal | verbose

  # 무시할 경로
  ignore:
    - node_modules
    - dist
    - "*.generated.ts"

  # 최대 표시 규칙 수
  maxSuggestions: 3
```

## 관련 커맨드

- `/rule` - 규칙 상세 조회
- `/rule-search` - 규칙 검색
