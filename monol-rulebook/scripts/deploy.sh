#!/bin/bash
# Monol Rulebook 로컬 배포 스크립트

set -e

cd "$(dirname "$0")/.."

echo "📦 Monol Rulebook 배포"
echo ""

# 1. 타입 체크
echo "1. 타입 체크..."
npm run typecheck

# 2. 빌드
echo "2. 빌드..."
npm run build

# 3. 완료
echo "3. 빌드 완료"

echo ""
echo "✅ 배포 완료!"
echo "   monol-rulebook 명령어가 업데이트되었습니다."
