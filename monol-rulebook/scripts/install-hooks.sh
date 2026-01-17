#!/bin/bash
# Monol Rulebook - Claude Code Hook 설치

CLAUDE_SETTINGS="$HOME/.claude/settings.json"
CLAUDE_DIR="$HOME/.claude"

echo "🔧 Monol Rulebook Hook 설치"

# 1. .claude 디렉토리 생성
mkdir -p "$CLAUDE_DIR"

# 2. settings.json 생성 또는 수정
HOOK_VALUE='[{"hooks": [{"type": "command", "command": "monol-rulebook init 2>/dev/null || true"}]}]'

if [ -f "$CLAUDE_SETTINGS" ]; then
  # 기존 파일이 있으면 hooks 추가 (jq 사용 가능한 경우)
  if command -v jq &> /dev/null; then
    # jq로 hooks 추가
    tmp=$(mktemp)
    jq --argjson hook "$HOOK_VALUE" '.hooks.SessionStart = $hook' "$CLAUDE_SETTINGS" > "$tmp" && mv "$tmp" "$CLAUDE_SETTINGS"
    echo "✓ 기존 settings.json에 hook 추가됨"
  else
    echo "⚠️  jq가 없어서 기존 settings.json 수정 불가"
    echo "   수동으로 hooks 추가 필요"
  fi
else
  # 새 파일 생성
  cat > "$CLAUDE_SETTINGS" << 'EOF'
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "monol-rulebook init 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
EOF
  echo "✓ settings.json 생성됨"
fi

echo ""
echo "✅ 설치 완료!"
echo "   이제 Claude Code 세션 시작 시 자동으로 rulebook이 초기화됩니다."
