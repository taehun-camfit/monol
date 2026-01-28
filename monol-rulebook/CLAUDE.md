# Monol Rulebook Plugin

규칙 관리 및 플랫폼 동기화를 위한 Claude Code 플러그인입니다.

## 주요 기능

- **규칙 관리**: YAML 기반 규칙 정의 및 계층적 상속
- **검색**: 태그 및 키워드 기반 규칙 검색
- **플랫폼 동기화**: Cursor, Claude 등 다양한 플랫폼으로 규칙 내보내기
- **자동 발견**: 작업 컨텍스트에 맞는 규칙 자동 추천

## 커맨드

| 커맨드 | 한글 키워드 | 설명 |
|--------|-------------|------|
| `/rule [id]` | 규칙, 룰, 규칙보기 | 규칙 조회 및 목록 표시 |
| `/rule-add` | 규칙추가, 새규칙 | 대화형으로 새 규칙 추가 |
| `/rule-search <query>` | 규칙검색, 규칙찾기 | 규칙 검색 |
| `/rule-sync <platform>` | 규칙동기화, 규칙내보내기 | 플랫폼으로 규칙 동기화 |
| `/rule-history <id>` | 규칙이력, 규칙히스토리 | 규칙 변경 이력 조회 |

**한글 자연어 입력 지원**: "규칙 보여줘", "새 규칙 추가해줘" 등으로 말하면 해당 커맨드가 실행됩니다.

## 규칙 구조

```yaml
# rules/code/naming.yaml
id: naming-001
name: 변수명 규칙
description: 변수명은 camelCase를 사용합니다
category: code/naming
tags: [naming, variables, style]
severity: warning
examples:
  good:
    - "const userName = 'kent'"
  bad:
    - "const user_name = 'kent'"
```

## 계층 구조

규칙은 다음 우선순위로 병합됩니다:

1. **패키지 레벨** (`./rules/`) - 최우선
2. **프로젝트 레벨** (`<project>/rules/`)
3. **글로벌 레벨** (`~/.config/monol/rules/`) - 기본값

## 라이브러리 사용

```typescript
import { RulebookManager, RuleSearch } from './foundations/logic/lib';

// 규칙 로드
const manager = new RulebookManager();
const rules = await manager.loadRulesForPath(process.cwd());

// 규칙 검색
const search = new RuleSearch(rules);
const results = search.searchByTags(['naming', 'style']);
```
