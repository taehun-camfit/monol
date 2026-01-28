---
description: 규칙 변경 이력 조회 및 버전 관리 (한글: 규칙이력, 룰이력, 규칙히스토리)
argument-hint: "<rule-id> [--diff <v1> <v2>]"
allowed-tools: [Read, Glob, Grep]
---

# /rule-history - 규칙 변경 이력 관리

규칙의 변경 이력을 조회하고, 버전 간 비교 및 롤백을 수행합니다.

## 라이브러리 연동

```typescript
import { RulebookManager, RuleVersioning, formatDiff } from './lib';

const manager = new RulebookManager(workspacePath);
const versioning = new RuleVersioning(workspacePath);
```

## 사용법

### 1. 변경 이력 조회

```
/rule-history naming-001
```

**출력 형식:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 규칙 변경 이력: naming-001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

현재 버전: 1.2.0 (active)
작성자: @kent
최종 수정: 2025-01-18

📋 변경 이력 (최근 10개)

v1.2.0 (2025-01-18) - @kent
  → 예외 케이스 추가: 외부 API 응답 객체

v1.1.0 (2025-01-15) - @kim
  → 클래스명 규칙 추가 (PascalCase)

v1.0.0 (2025-01-10) - @kent
  → 초기 버전 생성

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 버전 비교: /rule-history naming-001 --diff 1.0.0 1.2.0
💡 롤백: /rule-history naming-001 --rollback 1.1.0
```

### 2. 버전 비교 (diff)

```
/rule-history naming-001 --diff 1.0.0 1.2.0
```

**출력 형식:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 버전 비교: naming-001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

v1.0.0 → v1.2.0

~ description:
  - "변수명은 camelCase를 사용합니다"
  + "변수명, 함수명, 클래스명에 대한 네이밍 컨벤션입니다..."

+ tags:
  + ["classes", "functions"]

~ exceptions:
  - []
  + ["외부 API 응답 객체의 snake_case 필드"]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

변경된 필드: 3개
  - 수정: description, exceptions
  - 추가: tags
```

### 3. 롤백

```
/rule-history naming-001 --rollback 1.0.0
```

**출력 형식:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏪ 롤백 확인: naming-001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

현재 버전: v1.2.0
롤백 대상: v1.0.0

변경될 내용:
  ~ description: 클래스명 규칙 제거
  - tags: ["classes", "functions"] 제거
  - exceptions: 예외 케이스 제거

⚠️ 이 작업은 되돌릴 수 없습니다.
롤백을 진행하시겠습니까? [y/N]
```

롤백 확인 후:

```
✅ 롤백 완료!

  이전 버전: v1.2.0
  새 버전: v1.3.0 (v1.0.0에서 롤백)

  저장 위치: rules/code/naming.yaml
```

## 옵션

| 옵션 | 설명 | 예시 |
|------|------|------|
| `--diff`, `-d` | 두 버전 비교 | `--diff 1.0.0 1.2.0` |
| `--rollback`, `-r` | 특정 버전으로 롤백 | `--rollback 1.0.0` |
| `--all`, `-a` | 전체 이력 표시 | `--all` |
| `--format` | 출력 형식 | `--format json` |

## 구현 로직

```typescript
async function executeRuleHistory(args: string) {
  const { ruleId, diff, rollback, all } = parseArgs(args);

  const manager = new RulebookManager(workspacePath);
  const versioning = new RuleVersioning(workspacePath);

  // 규칙 로드
  await manager.loadRulesForPath(workspacePath);
  const rule = manager.getRule(ruleId);

  if (!rule) {
    console.log(`규칙을 찾을 수 없습니다: ${ruleId}`);
    return;
  }

  if (diff) {
    // 버전 비교
    const [fromVersion, toVersion] = diff;
    const diffResult = await versioning.diff(ruleId, fromVersion, toVersion);
    console.log(formatDiff(diffResult));
    return;
  }

  if (rollback) {
    // 롤백 확인
    const confirmed = await confirmRollback(ruleId, rollback);
    if (!confirmed) return;

    const rolledBack = await versioning.rollback(ruleId, rollback);
    await manager.saveRule(rolledBack);
    console.log(`✅ v${rollback}로 롤백되었습니다.`);
    return;
  }

  // 이력 조회
  const history = await versioning.getHistory(ruleId);
  displayHistory(rule, history, all);
}
```

## 버전 관리 정책

### 버전 증가 규칙

- **Major (x.0.0)**: 규칙의 의미가 크게 변경될 때
- **Minor (0.x.0)**: 새로운 예시나 예외 추가
- **Patch (0.0.x)**: 오타 수정, 문구 개선

### 자동 버전 증가

`/rule-add`나 수동 편집 후 저장 시 자동으로 patch 버전 증가:

```typescript
// rule-add 또는 편집 시
const updatedRule = await versioning.createVersion(
  existingRule,
  '예외 케이스 추가',
  '@kent'
);
await manager.saveRule(updatedRule);
```

### 히스토리 저장

변경 이력은 `rules/.history/` 디렉토리에 규칙별로 저장됩니다:

```
rules/
├── .history/
│   ├── naming-001.yaml
│   ├── style-001.yaml
│   └── git-001.yaml
├── code/
│   └── naming.yaml
└── ...
```

히스토리 파일 형식:

```yaml
entries:
  - version: "1.2.0"
    date: "2025-01-18T10:00:00Z"
    author: "@kent"
    changes: "예외 케이스 추가"
    snapshot:
      description: "..."
      tags: [...]

  - version: "1.1.0"
    date: "2025-01-15T10:00:00Z"
    author: "@kim"
    changes: "클래스명 규칙 추가"
    snapshot:
      description: "..."
      tags: [...]
```

## 관련 커맨드

- `/rule` - 규칙 조회
- `/rule-add` - 규칙 추가 (자동 버전 생성)
- `/rule-search` - 규칙 검색
