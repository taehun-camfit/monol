#!/usr/bin/env node
/**
 * Monol Rulebook CLI - 규칙 동기화
 *
 * 사용법:
 *   npx tsx bin/sync.ts [cursor|claude|all]
 *
 * 또는 npm script로:
 *   npm run sync
 *   npm run sync:cursor
 *   npm run sync:claude
 */
import { RulebookManager } from '../foundations/logic/lib/rulebook-manager.js';
import { CursorAdapter } from '../foundations/logic/lib/adapters/cursor-adapter.js';
import { ClaudeAdapter } from '../foundations/logic/lib/adapters/claude-adapter.js';
async function main() {
    const args = process.argv.slice(2);
    const target = args[0] || 'all';
    const basePath = process.cwd();
    console.log('📚 Monol Rulebook Sync\n');
    // 1. 규칙 로드
    const manager = new RulebookManager(basePath);
    const result = await manager.loadRulesForPath(basePath);
    if (result.rules.length === 0) {
        console.log('⚠️  로드된 규칙이 없습니다.');
        console.log('   rules/ 폴더에 YAML 규칙 파일을 추가하세요.');
        process.exit(1);
    }
    console.log(`📋 ${result.rules.length}개 규칙 로드됨\n`);
    // 2. 플랫폼별 동기화
    const adapters = [];
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
            }
            else {
                console.log(`❌ ${name}: ${syncResult.error}`);
            }
        }
        catch (e) {
            console.log(`❌ ${name}: ${e}`);
        }
    }
    console.log('\n완료!');
}
main().catch(e => {
    console.error('에러:', e);
    process.exit(1);
});
//# sourceMappingURL=sync.js.map