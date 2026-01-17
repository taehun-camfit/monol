#!/usr/bin/env node
/**
 * Monol Rulebook CLI
 *
 * 사용법:
 *   monol-rulebook init    # 초기 설정 (rules/ 참조 등록)
 *   monol-rulebook sync    # (선택) 규칙을 플랫폼 형식으로 변환
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { RulebookManager } from '../foundations/logic/lib/rulebook-manager.js';
import { CursorAdapter } from '../foundations/logic/lib/adapters/cursor-adapter.js';
import { ClaudeAdapter } from '../foundations/logic/lib/adapters/claude-adapter.js';

const CURSORRULES_CONTENT = `# Project Rules

이 프로젝트의 코딩 규칙은 \`rules/\` 폴더에 YAML 형식으로 정의되어 있습니다.

## 규칙 적용 방법

1. 작업 시작 전 \`rules/\` 폴더의 모든 YAML 파일을 읽으세요
2. 각 규칙의 severity에 따라 적용하세요:
   - error: 반드시 준수
   - warning: 권장 사항
   - info: 참고 정보
3. 규칙의 examples.good/bad를 참고하세요

## 규칙 구조

\`\`\`
rules/
├── .rulebook-config.yaml  # 설정 (글로벌 규칙 상속 등)
├── code/                  # 코드 규칙
│   ├── naming.yaml
│   └── style.yaml
└── workflow/              # 워크플로우 규칙
    └── git.yaml
\`\`\`

자세한 규칙은 rules/ 폴더를 직접 확인하세요.
`;

const CLAUDE_MD_CONTENT = `# Project Rules

이 프로젝트의 코딩 규칙은 \`rules/\` 폴더에 YAML 형식으로 정의되어 있습니다.

## 규칙 적용 방법

1. 작업 시작 전 \`rules/\` 폴더의 모든 YAML 파일을 읽으세요
2. 각 규칙의 severity에 따라 적용하세요:
   - error: 반드시 준수
   - warning: 권장 사항
   - info: 참고 정보
3. 규칙의 examples.good/bad를 참고하세요

## 규칙 구조

\`\`\`
rules/
├── .rulebook-config.yaml  # 설정 (글로벌 규칙 상속 등)
├── code/                  # 코드 규칙
└── workflow/              # 워크플로우 규칙
\`\`\`

자세한 규칙은 rules/ 폴더를 직접 확인하세요.
`;

async function init(basePath: string) {
  console.log('📚 Monol Rulebook 초기화\n');

  // 1. rules/ 폴더 확인
  const rulesPath = path.join(basePath, 'rules');
  try {
    await fs.access(rulesPath);
    console.log('✓ rules/ 폴더 존재');
  } catch {
    await fs.mkdir(rulesPath, { recursive: true });
    console.log('✓ rules/ 폴더 생성');
  }

  // 2. .cursorrules 생성
  const cursorrules = path.join(basePath, '.cursorrules');
  await fs.writeFile(cursorrules, CURSORRULES_CONTENT, 'utf-8');
  console.log('✓ .cursorrules 생성 (rules/ 참조)');

  // 3. CLAUDE.md 생성 또는 추가
  const claudeMd = path.join(basePath, 'CLAUDE.md');
  try {
    const existing = await fs.readFile(claudeMd, 'utf-8');
    if (!existing.includes('rules/')) {
      await fs.appendFile(claudeMd, '\n\n' + CLAUDE_MD_CONTENT);
      console.log('✓ CLAUDE.md에 rules/ 참조 추가');
    } else {
      console.log('✓ CLAUDE.md에 이미 rules/ 참조 있음');
    }
  } catch {
    await fs.writeFile(claudeMd, CLAUDE_MD_CONTENT, 'utf-8');
    console.log('✓ CLAUDE.md 생성 (rules/ 참조)');
  }

  console.log('\n✅ 초기화 완료!');
  console.log('   이제 rules/*.yaml 파일만 수정하면 Cursor/Claude Code에서 바로 적용됩니다.');
}

async function sync(basePath: string, target: string) {
  console.log('📚 Monol Rulebook Sync (레거시 모드)\n');

  const manager = new RulebookManager(basePath);
  const result = await manager.loadRulesForPath(basePath);

  if (result.rules.length === 0) {
    console.log('⚠️  로드된 규칙이 없습니다.');
    console.log('   rules/ 폴더에 YAML 규칙 파일을 추가하세요.');
    process.exit(1);
  }

  console.log(`📋 ${result.rules.length}개 규칙 로드됨\n`);

  const adapters: { name: string; adapter: CursorAdapter | ClaudeAdapter }[] = [];

  if (target === 'cursor' || target === 'all') {
    adapters.push({ name: 'Cursor', adapter: new CursorAdapter(basePath) });
  }
  if (target === 'claude' || target === 'all') {
    adapters.push({ name: 'Claude', adapter: new ClaudeAdapter(basePath) });
  }

  for (const { name, adapter } of adapters) {
    try {
      const syncResult = await adapter.sync(result.rules);
      if (syncResult.success) {
        console.log(`✅ ${name}: ${syncResult.outputPath}`);
        console.log(`   ${syncResult.rulesCount}개 규칙 동기화됨`);
      } else {
        console.log(`❌ ${name}: ${syncResult.error}`);
      }
    } catch (e) {
      console.log(`❌ ${name}: ${e}`);
    }
  }

  console.log('\n완료!');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'init';
  const basePath = process.cwd();

  switch (command) {
    case 'init':
      await init(basePath);
      break;
    case 'sync':
      const target = args[1] || 'all';
      await sync(basePath, target);
      break;
    default:
      console.log('사용법:');
      console.log('  monol-rulebook init    # 초기 설정 (권장)');
      console.log('  monol-rulebook sync    # 규칙을 플랫폼 형식으로 변환');
  }
}

main().catch(e => {
  console.error('에러:', e);
  process.exit(1);
});
