---
description: 규칙 조회 및 관리 (한글: 규칙, 룰, 규칙보기, 규칙목록)
argument-hint: "[id | category | list | stats]"
allowed-tools: [Read, Glob, Grep]
---

# /rule - 규칙 조회 및 관리

규칙을 조회하고 관리하는 커맨드입니다.

## 라이브러리 연동

```typescript
import { RulebookManager, RuleSearch, getRuleStats, groupRulesByCategory } from './lib';

const manager = new RulebookManager(workspacePath);
const result = await manager.loadRulesForPath(workspacePath);
const search = new RuleSearch(result.rules);
```

## 사용법

### 1. 규칙 목록 보기

인자 없이 실행하거나 `list` 인자로 실행:

```
/rule
/rule list
```

**출력 형식:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 규칙 목록 (총 N개)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 code (2개)
  ├─ style-001: 코드 포맷팅 규칙 [warning]
  └─ naming-001: 변수명 규칙 [warning]

📁 workflow (1개)
  └─ git-001: 커밋 메시지 규칙 [error]

Tags: naming, style, formatting, git, commit
```

### 2. 특정 규칙 상세 보기

규칙 ID로 조회:

```
/rule naming-001
```

**출력 형식:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 naming-001: 변수명 규칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

카테고리: code/naming
심각도: ⚠️ warning
태그: naming, variables, functions, classes

설명:
변수명, 함수명, 클래스명에 대한 네이밍 컨벤션입니다.
- 변수/함수: camelCase
- 클래스/타입: PascalCase
- 상수: SCREAMING_SNAKE_CASE
- 파일명: kebab-case

✅ Good:
  const userName = 'kent';
  function getUserById(id: string) { }

❌ Bad:
  const user_name = 'kent';
  function GetUserById(id) { }

예외:
  - 외부 API 응답 객체의 snake_case 필드
  - 레거시 코드와의 호환성이 필요한 경우

관련 규칙: style-001
```

### 3. 카테고리별 조회

카테고리 경로로 조회:

```
/rule code
/rule code/naming
```

**출력 형식:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 카테고리: code (2개)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  style-001: 코드 포맷팅 규칙 [warning]
    → 일관된 코드 포맷팅을 유지하기 위한 규칙

  naming-001: 변수명 규칙 [warning]
    → 변수명, 함수명, 클래스명에 대한 네이밍 컨벤션
```

### 4. 통계 보기

```
/rule stats
```

**출력 형식:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 규칙 통계
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

총 규칙 수: 3

카테고리별:
  code      ████████████████ 2 (67%)
  workflow  ████████ 1 (33%)

심각도별:
  error     ████████ 1 (33%)
  warning   ████████████████ 2 (67%)
  info      0 (0%)

상위 태그:
  naming (1) | style (1) | formatting (1) | git (1) | commit (1)
```

## 구현 로직

```typescript
async function executeRuleCommand(args: string) {
  const manager = new RulebookManager(workspacePath);
  const result = await manager.loadRulesForPath(workspacePath);

  if (!args || args === 'list') {
    // 목록 출력
    const groups = groupRulesByCategory(result.rules);
    // ... 포맷팅
  } else if (args === 'stats') {
    // 통계 출력
    const stats = getRuleStats(result.rules);
    // ... 포맷팅
  } else if (args.includes('/') || args.includes('-')) {
    if (args.includes('-')) {
      // 규칙 ID
      const rule = manager.getRule(args);
      // ... 상세 출력
    } else {
      // 카테고리
      const rules = manager.getRulesByCategory(args);
      // ... 목록 출력
    }
  }
}
```

## 관련 커맨드

- `/rule-add` - 새 규칙 추가
- `/rule-search` - 규칙 검색
- `/rule-sync` - 플랫폼 동기화
