/**
 * Monol Rulebook - Rulebook Manager
 *
 * 규칙 로드, 저장, 계층 병합을 담당하는 핵심 매니저
 */
import type { Rule, LoadResult, SaveResult, MergeResult, DependencyGraph, ConflictReport } from './types.js';
import { DependencyError } from './errors.js';
export declare class RulebookManager {
    private basePath;
    private config;
    private rulesCache;
    constructor(basePath?: string);
    /**
     * 특정 경로에 대한 계층적 규칙 로드
     */
    loadRulesForPath(targetPath: string): Promise<LoadResult>;
    /**
     * 단일 규칙 저장
     */
    saveRule(rule: Rule, targetPath?: string): Promise<SaveResult>;
    /**
     * 인덱스 업데이트
     */
    updateIndex(targetPath?: string): Promise<void>;
    /**
     * 규칙 병합
     */
    mergeRules(rules: Rule[]): MergeResult;
    /**
     * 규칙 가져오기
     */
    getRule(id: string): Rule | undefined;
    /**
     * 모든 규칙 가져오기
     */
    getAllRules(): Rule[];
    /**
     * 카테고리별 규칙 가져오기
     */
    getRulesByCategory(category: string): Rule[];
    /**
     * 의존성 그래프 구축
     */
    buildDependencyGraph(): DependencyGraph;
    /**
     * 순환 의존성 감지
     */
    detectCircularDependencies(): string[][];
    /**
     * 의존성 순서로 규칙 정렬 (위상 정렬)
     */
    sortByDependencies(rules: Rule[]): Rule[];
    /**
     * 규칙 충돌 검사
     */
    checkConflicts(rules?: Rule[]): ConflictReport;
    /**
     * 규칙 의존성 유효성 검사
     */
    validateDependencies(rule: Rule): {
        valid: boolean;
        errors: DependencyError[];
    };
    /**
     * 모든 규칙의 의존성 검증
     */
    validateAllDependencies(): {
        valid: boolean;
        errors: DependencyError[];
    };
    /**
     * 그래프에서 순환 찾기 (DFS)
     */
    private findCycles;
    private loadConfig;
    private loadRulesFromDirectory;
    private resolvePath;
    private resolveConflict;
    private aggregateCategories;
    private aggregateTags;
}
/**
 * 규칙 ID 생성
 */
export declare function generateRuleId(category: string, existingIds: string[]): string;
/**
 * 규칙 유효성 검사
 */
export declare function validateRule(rule: Partial<Rule>): {
    valid: boolean;
    errors: string[];
};
/**
 * 규칙 템플릿 생성
 */
export declare function createRuleTemplate(id: string, name: string, category: string): Rule;
export default RulebookManager;
//# sourceMappingURL=rulebook-manager.d.ts.map