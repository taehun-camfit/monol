/**
 * Monol Rulebook - Platform Adapter Base
 *
 * 플랫폼 어댑터 공통 인터페이스 및 유틸리티
 */
import type { Rule, PlatformAdapter, SyncResult, Severity } from '../types.js';
export declare abstract class BasePlatformAdapter implements PlatformAdapter {
    abstract name: string;
    protected basePath: string;
    constructor(basePath: string);
    abstract read(): Promise<string>;
    abstract format(rules: Rule[]): string;
    abstract write(content: string): Promise<void>;
    sync(rules: Rule[]): Promise<SyncResult>;
    protected abstract getOutputPath(): string;
    protected ensureDir(filePath: string): Promise<void>;
}
/**
 * 심각도 아이콘
 */
export declare function getSeverityIcon(severity: Severity): string;
/**
 * 규칙을 마크다운으로 변환
 */
export declare function ruleToMarkdown(rule: Rule, includeExamples?: boolean): string;
/**
 * 규칙 그룹을 마크다운 문서로 변환
 */
export declare function rulesToMarkdownDocument(rules: Rule[], options?: {
    title?: string;
    includeExamples?: boolean;
    includeToc?: boolean;
}): string;
/**
 * 규칙을 간단한 지시문으로 변환
 */
export declare function ruleToDirective(rule: Rule): string;
/**
 * 규칙 목록을 지시문 목록으로 변환
 */
export declare function rulesToDirectives(rules: Rule[]): string;
export declare function registerAdapter(name: string, adapter: new (basePath: string) => PlatformAdapter): void;
export declare function getAdapter(name: string, basePath: string): PlatformAdapter | undefined;
export declare function getAvailableAdapters(): string[];
export default BasePlatformAdapter;
//# sourceMappingURL=platform-adapter.d.ts.map