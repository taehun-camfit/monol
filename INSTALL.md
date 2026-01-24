# Monol 설치 가이드

Claude Code 플러그인 생태계 **Monol**의 설치 및 설정 가이드입니다.

---

## 요구 사항

- Node.js 18.0.0 이상
- Claude Code CLI 설치됨
- npm 또는 yarn

---

## 설치 방법

### 방법 1: 전체 설치 (권장)

모든 Monol 플러그인을 한 번에 설치합니다.

```bash
npm install -g monol
```

포함된 플러그인:
| 플러그인 | 설명 |
|---------|------|
| monol-logs | 세션 자동 저장, 요약, 로드맵 추출 |
| monol-plugin-scout | 플러그인 마켓플레이스 스캔 및 추천 |
| monol-rulebook | 프로젝트별 코딩 규칙 관리 |
| monol-channels | 멀티 세션 협업 및 의사결정 추적 |
| monol-datastore | 세션 간 데이터 영속성 |
| monol-workbase | 워크스페이스 및 프로젝트 관리 |
| monol-x | AI 에이전트 진화 플랫폼 |
| monol-design | CSS 디자인 시스템 |

### 방법 2: 개별 설치

필요한 플러그인만 선택적으로 설치합니다.

```bash
# 세션 로그 관리
npm install -g monol-logs

# 플러그인 탐색
npm install -g monol-plugin-scout

# 규칙 관리
npm install -g monol-rulebook

# 멀티 세션 협업
npm install -g monol-channels

# 데이터 영속성
npm install -g monol-datastore

# 워크스페이스 관리
npm install -g monol-workbase

# AI 진화 플랫폼
npm install -g monol-x

# 디자인 시스템 (CSS)
npm install -g monol-design
```

---

## 설치 확인

```bash
# 설치된 플러그인 확인
claude mcp list
```

정상 설치 시 다음과 같이 표시됩니다:
```
monol-logs: enabled
monol-plugin-scout: enabled
monol-rulebook: enabled
...
```

---

## 프로젝트 초기화

프로젝트에서 Monol을 사용하려면:

```bash
cd your-project

# 규칙 초기화 (선택)
/rule init

# 세션 저장 폴더 생성 (자동)
# .claude/sessions/ 폴더가 자동 생성됩니다
```

---

## 주요 명령어

### monol-logs (세션 관리)
```
/save          - 현재 세션 저장
/sessions      - 저장된 세션 목록
/summary       - AI 요약 생성
/roadmap       - TODO 추출
/branch        - 세션 분기 (worktree)
```

### monol-plugin-scout (플러그인 탐색)
```
/scout         - 플러그인 추천
/explore       - 카테고리별 탐색
/compare       - 플러그인 비교
/audit         - 보안 점검
```

### monol-rulebook (규칙 관리)
```
/rule          - 규칙 조회
/rule-add      - 규칙 추가
/rule-search   - 규칙 검색
/rule-sync     - 규칙 동기화
```

---

## 설정 파일

### 글로벌 설정
`~/.claude/settings.json`에서 플러그인 설정을 관리합니다.

### 프로젝트 설정
각 프로젝트의 `.claude/settings.local.json`에서 프로젝트별 설정을 관리합니다.

### 규칙 설정
`rules/` 폴더에 YAML 형식으로 코딩 규칙을 정의합니다.

```
rules/
├── .rulebook-config.yaml  # 규칙 설정
├── code/                  # 코드 규칙
└── workflow/              # 워크플로우 규칙
```

---

## 문제 해결

### 플러그인이 인식되지 않을 때
```bash
# Claude Code 재시작
claude --restart

# 또는 플러그인 재설치
npm uninstall -g monol
npm install -g monol
```

### 권한 오류 발생 시
```bash
# sudo 사용 (macOS/Linux)
sudo npm install -g monol

# 또는 npm prefix 설정
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### 특정 플러그인만 비활성화
`.claude/settings.local.json`에서:
```json
{
  "plugins": {
    "monol-x": {
      "enabled": false
    }
  }
}
```

---

## 업데이트

```bash
# 전체 업데이트
npm update -g monol

# 개별 업데이트
npm update -g monol-logs
```

---

## 제거

```bash
# 전체 제거
npm uninstall -g monol

# 개별 제거
npm uninstall -g monol-logs monol-plugin-scout monol-rulebook
```

---

## 링크

- GitHub: https://github.com/Camfit-Taehun/monol
- npm: https://www.npmjs.com/package/monol
- 이슈: https://github.com/Camfit-Taehun/monol/issues
