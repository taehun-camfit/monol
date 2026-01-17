/**
 * Monol Rulebook - Claude Adapter
 *
 * .claude/rules/ 디렉토리 동기화 어댑터
 */
import type { Rule } from '../types.js';
import { BasePlatformAdapter } from './platform-adapter.js';
export declare class ClaudeAdapter extends BasePlatformAdapter {
    name: string;
    private outputDir;
    protected getOutputPath(): string;
    read(): Promise<string>;
    format(rules: Rule[]): string;
    write(content: string): Promise<void>;
    /**
     * 카테고리별로 여러 파일 생성
     */
    syncMultiple(rules: Rule[]): Promise<{
        files: string[];
        errors: string[];
    }>;
    private formatIndex;
    private formatCategory;
    private formatRuleForClaude;
    private formatAllRules;
    private getCategoryGlobs;
    private capitalizeFirst;
}
export default ClaudeAdapter;
//# sourceMappingURL=claude-adapter.d.ts.map