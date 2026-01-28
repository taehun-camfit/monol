---
name: rule-add
description: 대화형 규칙 추가
args: "[--quick] [name]"
examples:
  - "/rule-add"
  - "/rule-add 'API 응답 형식 규칙'"
  - "/rule-add --quick"
---

# /rule-add - 대화형 규칙 추가

새로운 규칙을 대화형으로 추가합니다.

## 라이브러리 연동

```typescript
import { RulebookManager, generateRuleId, validateRule, createRuleTemplate, RuleSearch } from './lib';

const manager = new RulebookManager(workspacePath);
const existingRules = await manager.loadRulesForPath(workspacePath);
const search = new RuleSearch(existingRules.rules);
```

## 워크플로우

### 1. 시작 메시지

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
➕ 새 규칙 추가
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

규칙 정보를 입력해 주세요. 각 단계에서 예시가 제공됩니다.
```

### 2. 질문 순서 (AskUserQuestion 사용)

**질문 1: 규칙 이름**
- header: "이름"
- question: "규칙 이름을 입력해 주세요"
- 자유 입력 (Other 옵션)
- 예시 옵션 제공:
  - "변수명 규칙"
  - "API 응답 형식"
  - "에러 처리 패턴"
  - "커밋 메시지 형식"

**질문 2: 카테고리**
- header: "카테고리"
- question: "어떤 카테고리에 속하나요?"
- options:
  - "code/style" - 코드 스타일
  - "code/naming" - 네이밍 컨벤션
  - "code/pattern" - 디자인 패턴
  - "workflow" - 워크플로우

**질문 3: 심각도**
- header: "심각도"
- question: "규칙 위반 시 심각도는?"
- options:
  - "error" - 반드시 준수해야 함
  - "warning (추천)" - 권장 사항
  - "info" - 참고용

**질문 4: 태그 (multiSelect: true)**
- header: "태그"
- question: "관련 태그를 선택해 주세요"
- options: (기존 태그에서 상위 4개 + Other)
- multiSelect: true

### 3. 추가 정보 수집

규칙 설명과 예시는 자유 형식으로 입력받습니다:

```
규칙 설명을 입력해 주세요:
(줄바꿈으로 여러 줄 입력 가능, 빈 줄 2개로 종료)

> API 응답은 항상 다음 형식을 따릅니다:
> - success: boolean
> - data: T | null
> - error: { code: string, message: string } | null
>
```

```
✅ Good 예시를 입력해 주세요:
(한 줄에 하나씩, 빈 줄로 종료)

> return { success: true, data: user, error: null };
>
```

```
❌ Bad 예시를 입력해 주세요:
(한 줄에 하나씩, 빈 줄로 종료)

> return user; // 직접 반환
> return { user }; // 형식 불일치
>
```

### 4. 중복 검사

규칙 저장 전 유사 규칙 검사:

```typescript
const similar = search.findSimilar(newRule, 0.5);
if (similar.length > 0) {
  // 경고 출력
}
```

**중복 발견 시:**

```
⚠️ 유사한 규칙이 발견되었습니다:

  naming-001: 변수명 규칙 (유사도: 72%)
    → 매칭: name, tags, category

계속 추가하시겠습니까?
  [1] 계속 추가
  [2] 기존 규칙 수정
  [3] 취소
```

### 5. 규칙 확인 및 저장

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 새 규칙 미리보기
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: api-001
이름: API 응답 형식 규칙
카테고리: code/pattern
심각도: warning
태그: api, response, pattern

설명:
API 응답은 항상 다음 형식을 따릅니다...

✅ Good:
  return { success: true, data: user, error: null };

❌ Bad:
  return user;
  return { user };

이대로 저장하시겠습니까? [Y/n]
```

### 6. 저장 완료

```typescript
const result = await manager.saveRule(newRule);
if (result.success) {
  console.log(`✅ 규칙이 저장되었습니다: ${result.path}`);
}
```

```
✅ 규칙이 저장되었습니다!

  위치: rules/code/api.yaml
  ID: api-001

💡 팁: `/rule-sync`로 다른 플랫폼에 동기화할 수 있습니다.
```

## Quick 모드

`--quick` 플래그로 최소 정보만 입력:

```
/rule-add --quick
```

이름, 카테고리, 심각도만 입력받고 나머지는 기본값 사용.

## 구현 로직

```typescript
async function executeRuleAdd(args: string) {
  const manager = new RulebookManager(workspacePath);
  const existingRules = await manager.loadRulesForPath(workspacePath);
  const search = new RuleSearch(existingRules.rules);

  // 1. 기본 정보 수집
  const name = await askQuestion('이름', ...);
  const category = await askQuestion('카테고리', ...);
  const severity = await askQuestion('심각도', ...);
  const tags = await askQuestion('태그', ...);

  // 2. 상세 정보 수집
  const description = await getMultilineInput('설명');
  const goodExamples = await getMultilineInput('Good 예시');
  const badExamples = await getMultilineInput('Bad 예시');

  // 3. 규칙 생성
  const id = generateRuleId(category, existingRules.rules.map(r => r.id));
  const rule = createRuleTemplate(id, name, category);
  rule.severity = severity;
  rule.tags = tags;
  rule.description = description;
  rule.examples = { good: goodExamples, bad: badExamples };

  // 4. 중복 검사
  const similar = search.findSimilar(rule, 0.5);
  if (similar.length > 0) {
    // 사용자 확인
  }

  // 5. 저장
  const result = await manager.saveRule(rule);
  return result;
}
```

## 관련 커맨드

- `/rule` - 규칙 조회
- `/rule-search` - 규칙 검색
