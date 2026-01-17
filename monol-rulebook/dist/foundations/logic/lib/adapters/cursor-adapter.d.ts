/**
 * Monol Rulebook - Cursor Adapter
 *
 * .cursorrules 파일 동기화 어댑터
 */
import type { Rule } from '../types.js';
import { BasePlatformAdapter } from './platform-adapter.js';
export declare class CursorAdapter extends BasePlatformAdapter {
    name: string;
    private outputFile;
    protected getOutputPath(): string;
    read(): Promise<string>;
    format(rules: Rule[]): string;
    write(content: string): Promise<void>;
    private formatRule;
    private capitalizeFirst;
}
export default CursorAdapter;
//# sourceMappingURL=cursor-adapter.d.ts.map