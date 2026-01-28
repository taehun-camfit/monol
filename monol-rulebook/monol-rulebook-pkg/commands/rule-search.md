---
description: 규칙 검색 (한글: 규칙검색, 룰검색, 규칙찾기)
argument-hint: "<query> [--tags <tags>] [--category <cat>]"
allowed-tools: [Read, Glob, Grep]
---

# /rule-search - 규칙 검색

키워드, 태그, 카테고리 등 다양한 조건으로 규칙을 검색합니다.

## 라이브러리 연동

```typescript
import { RulebookManager, RuleSearch } from './lib';

const manager = new RulebookManager(workspacePath);
const result = await manager.loadRulesForPath(workspacePath);
const search = new RuleSearch(result.rules);
```

## 사용법

### 1. 키워드 검색

```
/rule-search naming
/rule-search "커밋 메시지"
```

**출력 형식:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 검색 결과: "naming" (2건)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. naming-001: 변수명 규칙 [warning]
   📁 code/naming | 🏷️ naming, variables
   매칭: name, tags, description
   → 변수명, 함수명, 클래스명에 대한 네이밍 컨벤션

2. style-001: 코드 포맷팅 규칙 [warning]
   📁 code/style | 🏷️ style, formatting
   매칭: description
   → 일관된 코드 포맷팅을 유지하기 위한 규칙...
```

### 2. 태그 검색

```
/rule-search --tags style
/rule-search --tags naming,variables
```

쉼표로 구분된 태그는 OR 조건으로 검색됩니다.

### 3. 카테고리 필터

```
/rule-search api --category code
/rule-search --category workflow
```

### 4. 심각도 필터

```
/rule-search --severity error
/rule-search naming --severity warning
```

### 5. 복합 검색

```
/rule-search naming --tags style --category code --severity warning
```

## 옵션

| 옵션 | 설명 | 예시 |
|------|------|------|
| `--tags`, `-t` | 태그 필터 (쉼표 구분) | `--tags style,naming` |
| `--category`, `-c` | 카테고리 필터 | `--category code/style` |
| `--severity`, `-s` | 심각도 필터 | `--severity error` |
| `--limit`, `-l` | 결과 수 제한 | `--limit 5` |
| `--enabled` | 활성화된 규칙만 | `--enabled` |

## 인터랙티브 모드

인자 없이 실행 시 인터랙티브 모드:

```
/rule-search
```

**인터랙티브 질문:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 규칙 검색
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

검색어를 입력하세요 (Enter로 건너뛰기):
>

태그로 필터링하시겠습니까?
  [1] naming
  [2] style
  [3] git
  [4] formatting
  [5] 건너뛰기
>
```

## 구현 로직

```typescript
async function executeRuleSearch(args: string) {
  const manager = new RulebookManager(workspacePath);
  const loaded = await manager.loadRulesForPath(workspacePath);
  const search = new RuleSearch(loaded.rules);

  // 인자 파싱
  const { keyword, tags, category, severity, limit } = parseArgs(args);

  // 검색 실행
  const results = search.search({
    keyword,
    tags: tags?.split(','),
    category,
    severity,
    limit: limit || 10,
  });

  // 결과 출력
  if (results.length === 0) {
    console.log('검색 결과가 없습니다.');
    return;
  }

  for (const result of results) {
    console.log(`${result.rule.id}: ${result.rule.name} [${result.rule.severity}]`);
    console.log(`  📁 ${result.rule.category} | 🏷️ ${result.rule.tags.join(', ')}`);
    if (result.matchedFields.length > 0) {
      console.log(`  매칭: ${result.matchedFields.join(', ')}`);
    }
    console.log(`  → ${result.rule.description.slice(0, 60)}...`);
  }
}

function parseArgs(args: string): SearchArgs {
  const parts = args.split(/\s+/);
  const result: SearchArgs = {};

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '--tags' || parts[i] === '-t') {
      result.tags = parts[++i];
    } else if (parts[i] === '--category' || parts[i] === '-c') {
      result.category = parts[++i];
    } else if (parts[i] === '--severity' || parts[i] === '-s') {
      result.severity = parts[++i] as Severity;
    } else if (parts[i] === '--limit' || parts[i] === '-l') {
      result.limit = parseInt(parts[++i]);
    } else if (!parts[i].startsWith('-')) {
      result.keyword = parts[i].replace(/^["']|["']$/g, '');
    }
  }

  return result;
}
```

## 출력 상세도

### 간략 출력 (기본)

```
naming-001: 변수명 규칙 [warning]
  → 변수명, 함수명, 클래스명에 대한 네이밍 컨벤션
```

### 상세 출력 (`--verbose`)

```
naming-001: 변수명 규칙 [warning]
  📁 code/naming | 🏷️ naming, variables, functions
  📅 2025-01-18 | 📝 2025-01-18
  매칭 점수: 15 (id, name, tags, description)

  설명: 변수명, 함수명, 클래스명에 대한 네이밍 컨벤션입니다.
  - 변수/함수: camelCase
  - 클래스/타입: PascalCase

  ✅ Good: const userName = 'kent';
  ❌ Bad: const user_name = 'kent';
```

## 관련 커맨드

- `/rule` - 규칙 조회
- `/rule-add` - 규칙 추가
