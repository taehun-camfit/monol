---
description: Project coding rules
globs: **/*
alwaysApply: true
---

# Project Rules

## 변수명 규칙

**ID:** `naming-variable-001` | **Severity:** 🟡 warning

변수명, 함수명, 클래스명에 대한 네이밍 컨벤션입니다.

- 변수/함수: camelCase
- 클래스/타입: PascalCase
- 상수: SCREAMING_SNAKE_CASE
- 파일명: kebab-case

### Correct
```
const userName = 'kent';
function getUserById(id: string) { }
class UserService { }
const MAX_RETRY_COUNT = 3;
// 파일명: user-service.ts
```

### Incorrect
```
const user_name = 'kent';
function GetUserById(id) { }
class user_service { }
const maxRetryCount = 3;  // 상수는 SCREAMING_CASE
// 파일명: UserService.ts
```

### Exceptions
- 외부 API 응답 객체의 snake_case 필드
- 레거시 코드와의 호환성이 필요한 경우


---

## 코드 포맷팅 규칙

**ID:** `style-format-001` | **Severity:** 🟡 warning

일관된 코드 포맷팅을 유지하기 위한 규칙입니다.
Prettier 설정을 따르며, 들여쓰기는 2칸 스페이스를 사용합니다.

### Correct
```
function greet(name: string) {
  return `Hello, ${name}!`;
}
const config = {
  indent: 2,
  semi: true,
};
```

### Incorrect
```
function greet(name:string){
return `Hello, ${name}!`
}
const config = {indent: 2,semi: true}
```

### Exceptions
- 자동 생성된 코드 (*.generated.ts)
- 벤더 라이브러리


---

## Claude Code 플러그인 배포

**ID:** `deploy-claude-plugin-001` | **Severity:** 🔴 error

Claude Code 플러그인을 npm으로 배포할 때 필요한 디렉토리 구조와 설정입니다.

**핵심 체크리스트:**
1. 디렉토리 구조 (.claude-plugin/, *-pkg/)
2. plugin.json 2개 (npm source용, directory source용)
3. marketplace.json 설정
4. package.json files 필드
5. postinstall 스크립트 (known_marketplaces.json 자동 등록)
6. settings.json 등록
7. **문서 업데이트 (docs/USER-GUIDE.md, docs/TECHNICAL.md)**

## 필수 디렉토리 구조

```
my-plugin/
├── .claude-plugin/
│   ├── marketplace.json    # directory source용 (마켓플레이스 메타데이터)
│   └── plugin.json         # npm source용 (직접 참조)
├── my-plugin-pkg/          # 실제 플러그인 코드 (서브디렉토리 필수)
│   ├── plugin.json         # 플러그인 정의 (directory source용)
│   ├── commands/           # 슬래시 커맨드 (.md 파일)
│   ├── skills/             # 스킬 정의
│   ├── hooks/              # 훅 정의 (hooks.json + .md 파일)
│   └── agents/             # 에이전트 정의
├── docs/                   # 문서 (필수!)
│   ├── USER-GUIDE.md       # 사용자 가이드
│   └── TECHNICAL.md        # 기술 문서
└── package.json            # npm 패키지 설정
```

**중요**: npm source와 directory source 모두 지원하려면 plugin.json이 2개 필요:
- `.claude-plugin/plugin.json` → npm source용 (경로: `my-plugin-pkg/commands/`)
- `my-plugin-pkg/plugin.json` → directory source용 (경로: `commands/`)

## marketplace.json 형식

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "my-plugin",
  "description": "플러그인 설명",
  "owner": { "name": "Author" },
  "plugins": [{
    "name": "my-plugin",
    "description": "플러그인 설명",
    "author": { "name": "Author" },
    "source": "./my-plugin-pkg",
    "category": "productivity"
  }]
}
```

## plugin.json 형식

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "플러그인 설명",
  "author": "Author",
  "commands": "commands/",
  "skills": "skills/",
  "hooks": "hooks/",
  "agents": "agents/"
}
```

## 커맨드 파일 frontmatter (.md)

```yaml
---
description: 커맨드 설명
argument-hint: "[args]"
allowed-tools: [Read, Write, Edit, Bash]
---
```

주의: `name` 필드 사용 금지. 파일명이 커맨드명이 됨.

## package.json files 설정

```json
{
  "files": [
    ".claude-plugin",
    "my-plugin-pkg"
  ]
}
```

## settings.json 등록

### npm source (권장)
```json
{
  "extraKnownMarketplaces": {
    "my-plugin": {
      "source": {
        "source": "npm",
        "package": "my-plugin"
      }
    }
  },
  "enabledPlugins": {
    "my-plugin@my-plugin": true
  }
}
```

### directory source (로컬 개발용)
```json
{
  "extraKnownMarketplaces": {
    "my-plugin": {
      "source": {
        "source": "directory",
        "path": "/path/to/installed/package"
      }
    }
  },
  "enabledPlugins": {
    "my-plugin@my-plugin": true
  }
}
```

### Correct
```
# 올바른 구조
.claude-plugin/marketplace.json → source: "./my-plugin-pkg"
my-plugin-pkg/plugin.json → commands: "commands/"
# 커맨드 frontmatter (name 없음)
---
description: 규칙 조회 및 관리
argument-hint: "[id | list]"
allowed-tools: [Read, Glob]
---
```

### Incorrect
```
# 잘못된 구조 - source가 "." (루트)
.claude-plugin/marketplace.json → source: "."
# 잘못된 커맨드 frontmatter - name 필드 사용
---
name: my-command
description: 커맨드 설명
---
# 문서 없이 배포 - 사용자가 사용법을 알 수 없음!
my-plugin/
├── .claude-plugin/
├── my-plugin-pkg/
└── package.json
# docs/USER-GUIDE.md 누락!
# docs/TECHNICAL.md 누락!
```

### Exceptions
- 로컬 개발 환경에서는 directory source로 직접 경로 지정 가능


---

## 커밋 메시지 규칙

**ID:** `git-commit-001` | **Severity:** 🔴 error

Conventional Commits 형식을 따르는 커밋 메시지 규칙입니다.

형식: <type>(<scope>): <subject>

타입:
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 변경
- style: 코드 스타일 (포맷팅)
- refactor: 리팩토링
- test: 테스트 추가/수정
- chore: 빌드, 설정 변경

### Correct
```
feat(auth): add social login support
fix(api): resolve timeout issue in user endpoint
docs(readme): update installation guide
refactor(utils): extract date formatting logic
```

### Incorrect
```
fixed bug
WIP
asdf
Update user.ts
```

### Exceptions
- 머지 커밋 (자동 생성)
- 리버트 커밋


---

## 플래닝 강화 (Multi-Perspective Reinforcement)

**ID:** `planning-reinforcement-001` | **Severity:** 🔵 info

플래닝 시 여러 관점에서 시나리오를 작성하고,
이를 기반으로 플랜을 반복적으로 보완하여 완성도를 높인다.

### Correct
```
## 플래닝 강화 (2회 반복)

### 1차 반복

#### 관점별 시나리오

**[사용자 관점]**
1. 신규 사용자가 회원가입 후 첫 로그인
2. 기존 사용자가 비밀번호 기억 못함
3. 모바일에서 빠르게 로그인하고 싶음

**[시스템 관점]**
1. 로그인 요청 → 인증 서버 → 토큰 발급
2. 세션 만료 → 리프레시 토큰으로 갱신
3. 동시 로그인 제한 체크

**[보안 관점]**
1. 브루트포스 공격 방어
2. 세션 하이재킹 방지
3. CSRF 토큰 검증

#### 영역별 매핑
- Frontend: 로그인 폼, 에러 메시지, 로딩 상태
- Backend: 인증 API, 토큰 관리, 로그 기록
- Data: 사용자 테이블, 세션 테이블, 로그인 이력

#### 1차 플랜
1. AuthService 구현
2. 로그인 API 엔드포인트
3. 프론트엔드 로그인 폼

#### 갭 분석
- 누락: 동시 로그인 제한 로직
- 누락: 브루트포스 방어 미구현
- 누락: 리프레시 토큰 플로우

### 2차 반복

#### 추가 시나리오
**[운영 관점]**
1. 로그인 실패 급증 시 알림
2. 특정 IP 차단 필요 시

**[성능 관점]**
1. 로그인 피크 시간대 처리
2. 토큰 검증 캐싱

#### 최종 플랜
1. AuthService 구현
2. 로그인 API + 속도 제한
3. 토큰 관리 + 리프레시 플로우
4. 동시 로그인 제한 미들웨어
5. 프론트엔드 로그인 폼
6. 모니터링 대시보드
```

### Incorrect
```
시나리오 없이 바로 플랜 작성
한 관점(사용자)만 고려
갭 분석 없이 1회만 진행
영역별 매핑 없이 모호한 플랜
```

### Exceptions
- 버그 수정 (원인이 명확한 경우)
- 단순 UI 수정
- 설정 변경
- 문서 수정


---

## 시나리오 기반 플래닝

**ID:** `planning-scenario-001` | **Severity:** 🟡 warning

새로운 기능 구현 전에 반드시:
1. 활용 시나리오 10개 작성
2. 시나리오 기반 엣지 케이스 도출
3. 구현 계획 수립

### Correct
```
## 활용 시나리오
1. 사용자가 정상 로그인
2. 비밀번호 틀림 (1회)
3. 비밀번호 3회 틀려서 계정 잠김
4. 잠긴 계정으로 로그인 시도
5. 비밀번호 찾기 요청
6. 소셜 로그인 (Google)
7. 소셜 로그인 (Apple)
8. 자동 로그인 (Remember me)
9. 다른 기기에서 동시 로그인
10. 세션 만료 후 재로그인

## 엣지 케이스
- 네트워크 끊김 중 로그인 시도
- 비밀번호 변경 직후 기존 세션 처리
- 탈퇴한 계정으로 소셜 로그인 시도

## 구현 계획
1. AuthService 인터페이스 정의
2. 로그인 로직 구현
3. 세션 관리 구현
4. 단위 테스트 작성
5. 통합 테스트 작성
```

### Incorrect
```
기능 설명만 듣고 바로 코드 작성 시작
시나리오 3개만 생각하고 구현
엣지 케이스 고려 없이 happy path만 구현
```

### Exceptions
- 버그 수정 (이미 시나리오가 명확한 경우)
- 단순 리팩토링
- 1줄 수정 수준의 변경


---

## 변수명 규칙

**ID:** `naming-001` | **Severity:** 🟡 warning

변수명, 함수명, 클래스명에 대한 네이밍 컨벤션입니다.

- 변수/함수: camelCase
- 클래스/타입: PascalCase
- 상수: SCREAMING_SNAKE_CASE
- 파일명: kebab-case

### Correct
```
const userName = 'kent';
function getUserById(id: string) { }
class UserService { }
const MAX_RETRY_COUNT = 3;
// 파일명: user-service.ts
```

### Incorrect
```
const user_name = 'kent';
function GetUserById(id) { }
class user_service { }
const maxRetryCount = 3;  // 상수는 SCREAMING_CASE
// 파일명: UserService.ts
```

### Exceptions
- 외부 API 응답 객체의 snake_case 필드
- 레거시 코드와의 호환성이 필요한 경우


---

## 코드 포맷팅 규칙

**ID:** `style-001` | **Severity:** 🟡 warning

일관된 코드 포맷팅을 유지하기 위한 규칙입니다.
Prettier 설정을 따르며, 들여쓰기는 2칸 스페이스를 사용합니다.

### Correct
```
function greet(name: string) {
  return `Hello, ${name}!`;
}
const config = {
  indent: 2,
  semi: true,
};
```

### Incorrect
```
function greet(name:string){
return `Hello, ${name}!`
}
const config = {indent: 2,semi: true}
```

### Exceptions
- 자동 생성된 코드 (*.generated.ts)
- 벤더 라이브러리


---

## 커밋 메시지 규칙

**ID:** `git-001` | **Severity:** 🔴 error

Conventional Commits 형식을 따르는 커밋 메시지 규칙입니다.

형식: <type>(<scope>): <subject>

타입:
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 변경
- style: 코드 스타일 (포맷팅)
- refactor: 리팩토링
- test: 테스트 추가/수정
- chore: 빌드, 설정 변경

### Correct
```
feat(auth): add social login support
fix(api): resolve timeout issue in user endpoint
docs(readme): update installation guide
refactor(utils): extract date formatting logic
```

### Incorrect
```
fixed bug
WIP
asdf
Update user.ts
```

### Exceptions
- 머지 커밋 (자동 생성)
- 리버트 커밋


---

## 시나리오 기반 플래닝

**ID:** `planning-001` | **Severity:** 🟡 warning

새로운 기능 구현 전에 반드시:
1. 활용 시나리오 10개 작성
2. 시나리오 기반 엣지 케이스 도출
3. 구현 계획 수립

### Correct
```
## 활용 시나리오
1. 사용자가 정상 로그인
2. 비밀번호 틀림 (1회)
3. 비밀번호 3회 틀려서 계정 잠김
4. 잠긴 계정으로 로그인 시도
5. 비밀번호 찾기 요청
6. 소셜 로그인 (Google)
7. 소셜 로그인 (Apple)
8. 자동 로그인 (Remember me)
9. 다른 기기에서 동시 로그인
10. 세션 만료 후 재로그인

## 엣지 케이스
- 네트워크 끊김 중 로그인 시도
- 비밀번호 변경 직후 기존 세션 처리
- 탈퇴한 계정으로 소셜 로그인 시도

## 구현 계획
1. AuthService 인터페이스 정의
2. 로그인 로직 구현
3. 세션 관리 구현
4. 단위 테스트 작성
5. 통합 테스트 작성
```

### Incorrect
```
기능 설명만 듣고 바로 코드 작성 시작
시나리오 3개만 생각하고 구현
엣지 케이스 고려 없이 happy path만 구현
```

### Exceptions
- 버그 수정 (이미 시나리오가 명확한 경우)
- 단순 리팩토링
- 1줄 수정 수준의 변경


---

## 작업 완료 후 로드맵 업데이트

**ID:** `workflow-roadmap-001` | **Severity:** 🟡 warning

기능 구현, 버그 수정, 또는 마일스톤 달성 후 반드시 로드맵을 업데이트합니다.

업데이트 항목:
1. 완료된 작업 항목에 체크 표시 (✅)
2. 진행 상황 백분율 업데이트
3. 완료 날짜 기록
4. 다음 단계 작업 확인

### Correct
```
## 작업 완료 후

### 1. ROADMAP.md 업데이트
- [x] 완료된 기능에 체크 표시
- [x] 버전 섹션에 ✅ 추가
- [x] 관련 하위 항목 모두 체크

### 2. 예시
### v1.0.x - 안정화 및 배포 준비 ✅
- [x] 통합 테스트 작성
- [x] E2E 테스트 (Playwright)
- [x] 성능 최적화
- [x] 보안 강화
- [x] 문서화 완료
- [x] 프로덕션 배포 설정
```

### Incorrect
```
기능 구현 후 로드맵 업데이트 없이 다음 작업으로 넘어감
부분적으로만 체크하고 하위 항목 누락
완료 표시(✅) 없이 체크만 함
```

### Exceptions
- 단순 타이포 수정
- 설정 파일 변경
- 로드맵에 포함되지 않은 유지보수 작업


---
