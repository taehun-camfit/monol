# Monol Rulebook 사용자 가이드

YAML 기반 코딩 규칙을 관리하고 Cursor/Claude Code에 동기화하는 Claude Code 플러그인입니다.

## 목차

1. [설치](#설치)
2. [빠른 시작](#빠른-시작)
3. [커맨드 레퍼런스](#커맨드-레퍼런스)
4. [규칙 작성법](#규칙-작성법)
5. [플랫폼 동기화](#플랫폼-동기화)
6. [고급 기능](#고급-기능)
7. [FAQ](#faq)

---

## 설치

### npm 설치 (권장)

```bash
npm install -g monol-rulebook
```

### Claude Code 플러그인 활성화

`~/.claude/settings.json`에 추가:

```json
{
  "extraKnownMarketplaces": {
    "monol-rulebook": {
      "source": {
        "source": "npm",
        "package": "monol-rulebook"
      }
    }
  },
  "enabledPlugins": {
    "monol-rulebook@monol-rulebook": true
  }
}
```

---

## 빠른 시작

### 1. 규칙 저장소 초기화

프로젝트 루트에서:

```bash
monol-rulebook init
```

생성되는 구조:
```
rules/
├── .rulebook-config.yaml   # 설정 파일
├── code/                   # 코드 규칙
├── workflow/               # 워크플로우 규칙
└── index.yaml              # 메타데이터
```

### 2. 첫 번째 규칙 추가

Claude Code에서 `/rule-add` 실행:

```
/rule-add
```

또는 한글로:
```
규칙 추가해줘
```

대화형 프롬프트를 따라 규칙을 생성합니다.

### 3. 규칙 확인

```
/rule list
```

### 4. 플랫폼에 동기화

```
/rule-sync cursor
```

---

## 커맨드 레퍼런스

### `/rule` - 규칙 조회 및 관리

| 사용법 | 설명 |
|--------|------|
| `/rule` 또는 `/rule list` | 모든 규칙 목록 |
| `/rule naming-001` | 특정 규칙 상세 조회 |
| `/rule code` | code 카테고리 규칙 |
| `/rule code/naming` | 세부 카테고리 조회 |
| `/rule stats` | 규칙 통계 |

**예시:**
```
# 모든 규칙 목록 보기
/rule list

# naming-001 규칙 상세 보기
/rule naming-001

# 워크플로우 관련 규칙만 보기
/rule workflow
```

**한글 키워드:** 규칙, 룰, 규칙보기, 규칙목록

---

### `/rule-add` - 규칙 추가

| 사용법 | 설명 |
|--------|------|
| `/rule-add` | 대화형 규칙 추가 |
| `/rule-add --quick` | 빠른 추가 (최소 정보) |

**워크플로우:**
1. 규칙 이름 입력
2. 카테고리 선택 (code, workflow, deploy 등)
3. 심각도 선택 (error, warning, info)
4. 태그 입력
5. 설명 및 예시 작성
6. 중복 검사 및 저장

**예시:**
```
# 대화형으로 새 규칙 추가
/rule-add

# 빠른 모드 (필수 정보만)
/rule-add --quick
```

**한글 키워드:** 규칙추가, 룰추가, 새규칙, 규칙만들기

---

### `/rule-search` - 규칙 검색

| 옵션 | 설명 |
|------|------|
| `/rule-search <keyword>` | 키워드 검색 |
| `--tags <tags>` | 태그 필터 (쉼표 구분) |
| `--category <cat>` | 카테고리 필터 |
| `--severity <sev>` | 심각도 필터 |
| `--limit <n>` | 결과 제한 |
| `--enabled` | 활성화된 규칙만 |

**예시:**
```
# "naming" 키워드로 검색
/rule-search naming

# 태그로 필터링
/rule-search --tags style,formatting

# error 심각도만 검색
/rule-search --severity error

# 복합 검색
/rule-search naming --category code --limit 5
```

**한글 키워드:** 규칙검색, 룰검색, 규칙찾기

---

### `/rule-sync` - 플랫폼 동기화

| 사용법 | 설명 |
|--------|------|
| `/rule-sync cursor` | Cursor IDE로 동기화 |
| `/rule-sync claude` | Claude Code로 동기화 |
| `/rule-sync all` | 모든 플랫폼 동기화 |

| 옵션 | 설명 |
|------|------|
| `--push` | 로컬 → 플랫폼 (기본값) |
| `--pull` | 플랫폼 → 로컬 |
| `--diff` | 차이점만 확인 |
| `--both` | 양방향 동기화 |
| `--dry-run` | 미리보기 (변경 없음) |
| `--force` | 확인 없이 덮어쓰기 |

**예시:**
```
# Cursor에 규칙 동기화 (push)
/rule-sync cursor

# Claude Code로 동기화
/rule-sync claude

# 모든 플랫폼에 동기화
/rule-sync all

# 변경 미리보기
/rule-sync cursor --dry-run

# 양방향 동기화
/rule-sync cursor --both

# 차이점 확인
/rule-sync cursor --diff
```

**한글 키워드:** 규칙동기화, 룰동기화, 규칙내보내기, 규칙싱크

---

### `/rule-history` - 변경 이력 관리

| 사용법 | 설명 |
|--------|------|
| `/rule-history <id>` | 규칙의 변경 이력 조회 |
| `--diff <v1> <v2>` | 두 버전 비교 |
| `--rollback <version>` | 특정 버전으로 롤백 |
| `--all` | 전체 이력 표시 |

**예시:**
```
# naming-001의 변경 이력 보기
/rule-history naming-001

# 버전 비교
/rule-history naming-001 --diff 1.0.0 1.2.0

# 이전 버전으로 롤백
/rule-history naming-001 --rollback 1.0.0
```

**한글 키워드:** 규칙이력, 룰이력, 규칙히스토리

---

## 규칙 작성법

### 규칙 파일 구조

규칙은 `rules/` 디렉토리에 YAML 파일로 저장됩니다.

```yaml
# rules/code/naming.yaml
id: naming-variable-001
name: 변수명 규칙
description: |
  변수명, 함수명, 클래스명에 대한 네이밍 컨벤션입니다.
  - 변수/함수: camelCase
  - 클래스/타입: PascalCase
  - 상수: SCREAMING_SNAKE_CASE

category: code/naming
tags: [naming, variables, style]
severity: warning

examples:
  good:
    - "const userName = 'kent';"
    - "function getUserById(id) { }"
    - "class UserService { }"
  bad:
    - "const user_name = 'kent';"
    - "function GetUserById(id) { }"

exceptions:
  - 외부 API 응답의 snake_case 필드
  - 레거시 코드와의 호환성

related: [style-format-001]
enabled: true
```

### 필수 필드

| 필드 | 설명 |
|------|------|
| `id` | 고유 식별자 (예: `naming-variable-001`) |
| `name` | 규칙 이름 |
| `description` | 상세 설명 |
| `category` | 카테고리 경로 (예: `code/naming`) |
| `tags` | 태그 목록 |
| `severity` | 심각도 (`error`, `warning`, `info`) |

### 권장 필드

| 필드 | 설명 |
|------|------|
| `examples.good` | 올바른 예시 목록 |
| `examples.bad` | 잘못된 예시 목록 |
| `exceptions` | 예외 상황 목록 |
| `related` | 관련 규칙 ID 목록 |

### 심각도 가이드

| 심각도 | 아이콘 | 용도 |
|--------|--------|------|
| `error` | 🔴 | 반드시 준수해야 하는 규칙 |
| `warning` | 🟡 | 권장 사항 |
| `info` | 🔵 | 참고 정보 |

### 카테고리 구조

```
rules/
├── code/           # 코드 관련 규칙
│   ├── naming/     # 네이밍 컨벤션
│   ├── style/      # 코드 스타일
│   └── security/   # 보안 규칙
├── workflow/       # 워크플로우 규칙
│   ├── git/        # Git 관련
│   └── review/     # 코드 리뷰
└── deploy/         # 배포 규칙
```

---

## 플랫폼 동기화

### Cursor IDE

동기화 시 `.cursorrules` 파일이 생성됩니다.

```bash
/rule-sync cursor
```

결과:
```
# .cursorrules
## 변수명 규칙
**ID:** naming-variable-001 | **Severity:** 🟡 warning
...
```

### Claude Code

동기화 시 `.claude/rules/` 디렉토리에 규칙이 생성됩니다.

```bash
/rule-sync claude
```

결과:
```
.claude/
└── rules/
    └── rules.md    # 규칙 문서
```

### 동기화 설정

`rules/.rulebook-config.yaml`에서 플랫폼별 설정:

```yaml
platforms:
  cursor:
    enabled: true
    outputFile: .cursorrules
    format: markdown
  claude:
    enabled: true
    outputDir: .claude/rules
    format: mdx
```

---

## 고급 기능

### 계층적 규칙 상속

규칙은 다음 우선순위로 병합됩니다:

1. **패키지 레벨** (`./rules/`) - 최우선
2. **프로젝트 레벨** (`<project>/rules/`)
3. **글로벌 레벨** (`~/.config/monol/rules/`) - 기본값

설정:
```yaml
# rules/.rulebook-config.yaml
hierarchy:
  enabled: true
  mergeStrategy: override   # override | merge | append

inheritance:
  - path: ~/.config/monol/rules
    priority: 1
  - path: ../shared-rules
    priority: 2
```

### 조건부 규칙 적용

특정 파일 패턴이나 환경에만 규칙 적용:

```yaml
conditions:
  filePatterns:
    - "**/*.ts"
    - "**/*.tsx"
  excludePatterns:
    - "**/*.d.ts"
    - "**/node_modules/**"
  environments:
    - development
    - staging
  branches:
    - main
    - develop
```

### 규칙 의존성

```yaml
dependencies:
  requires:
    - base-naming-001      # 이 규칙이 먼저 적용되어야 함
  conflicts:
    - legacy-naming-001    # 이 규칙과 충돌
  extends: parent-rule-001 # 부모 규칙 상속
```

### 버전 관리

규칙 변경 시 자동으로 버전이 증가합니다:

| 변경 유형 | 버전 증가 |
|-----------|-----------|
| 규칙 의미 크게 변경 | Major (x.0.0) |
| 예시/예외 추가 | Minor (0.x.0) |
| 오타, 문구 개선 | Patch (0.0.x) |

이력은 `rules/.history/` 에 저장됩니다.

### 자동 규칙 발견

`rule-discovery` 스킬이 코드 작성 중 관련 규칙을 자동으로 제안합니다:

- 파일 타입별 규칙 검색
- 코드 패턴 감지 (snake_case, TODO 등)
- 비침습적 인라인 힌트

설정:
```yaml
# rules/.rulebook-config.yaml
discovery:
  enabled: true
  maxSuggestions: 3
  patterns:
    - snake_case
    - TODO
    - console.log
```

---

## FAQ

### Q: 규칙 ID는 어떻게 정해야 하나요?

**A:** `{카테고리}-{세부}-{번호}` 형식을 권장합니다.
- 예: `naming-variable-001`, `git-commit-001`, `style-format-001`

### Q: 규칙 파일은 어디에 저장되나요?

**A:** 프로젝트의 `rules/` 디렉토리에 카테고리별로 저장됩니다.

### Q: 팀원들과 규칙을 공유하려면?

**A:**
1. `rules/` 디렉토리를 Git에 커밋
2. 또는 글로벌 규칙 (`~/.config/monol/rules/`)을 공유

### Q: 규칙이 적용되지 않는 경우?

**A:**
1. `enabled: true` 확인
2. `conditions.filePatterns` 확인
3. `/rule-sync` 실행하여 플랫폼에 동기화

### Q: 한글 자연어 입력이 안 되는 경우?

**A:** Claude Code 세션을 새로 시작하거나 플러그인을 재활성화하세요.

### Q: 충돌이 발생했을 때?

**A:** `/rule-sync --both` 실행 시 충돌 해결 옵션이 표시됩니다:
- 로컬 우선
- 원격 우선
- 수동 병합
- 건너뛰기

---

## 팀 협업 기능 (v1.0+)

### 웹 대시보드

웹 기반 대시보드를 통해 팀 규칙을 관리할 수 있습니다.

**주요 기능:**
- 팀 규칙 브라우징 및 검색
- 실시간 통계 대시보드
- 규칙 제안 및 리뷰 워크플로우
- 마켓플레이스에서 규칙 채택

**접속 방법:**
```
https://rulebook.monol.dev
```

### 팀 관리 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/rule-team list` | 소속 팀 목록 |
| `/rule-team create <name>` | 새 팀 생성 |
| `/rule-team join <slug>` | 팀 가입 |
| `/rule-team leave` | 팀 탈퇴 |

### 원격 동기화

로컬 규칙을 팀 서버와 동기화:

```bash
# 로컬 → 서버
/rule-sync --remote push

# 서버 → 로컬
/rule-sync --remote pull

# 양방향 동기화
/rule-sync --remote both
```

### 규칙 제안 워크플로우

팀 규칙 변경은 제안 → 리뷰 → 승인 워크플로우를 거칩니다:

1. **제안 생성**: `/rule-propose <rule-id>`
2. **리뷰 요청**: 자동으로 리뷰어 할당
3. **토론**: 인라인 코멘트 및 토론
4. **승인/거절**: 필요 승인 수 충족 시 자동 머지

### 마켓플레이스

공개된 규칙을 검색하고 채택:

```bash
# 규칙 검색
/rule-market search <keyword>

# 규칙 채택
/rule-adopt <rule-id>

# 내 규칙 발행
/rule-publish <rule-id>
```

---

## API 서버 설치 (Self-hosted)

자체 서버에 Monol Rulebook 백엔드를 설치하려면:

### Docker Compose

```bash
# 저장소 클론
git clone https://github.com/monol/monol-rulebook.git
cd monol-rulebook

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 설정 완료

# 실행
docker-compose up -d
```

### 필수 환경 변수

```env
# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/monol

# 인증
JWT_SECRET=your-secret-key
GITHUB_CLIENT_ID=your-github-id
GITHUB_CLIENT_SECRET=your-github-secret

# 프론트엔드
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### 서비스 구성

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Web | 3000 | Next.js 프론트엔드 |
| API | 3030 | Express API 서버 |
| PostgreSQL | 5432 | 데이터베이스 |
| Redis | 6379 | 캐시 |

---

## 추가 리소스

- [기술 문서](./TECHNICAL.md) - 아키텍처 및 확장 가이드
- [로드맵](./ROADMAP.md) - 향후 계획
- [예시](./examples/) - 규칙 작성 예시
- [API 문서](./API.md) - REST API 레퍼런스
