/**
 * Monol Rulebook - Rule Versioning
 *
 * 규칙 버전 관리, 이력 추적, 롤백 기능
 */
import type { Rule, ChangelogEntry, RuleDiff } from './types.js';
export declare class RuleVersioning {
    private basePath;
    private historyPath;
    constructor(basePath: string);
    /**
     * 규칙의 새 버전 생성
     */
    createVersion(rule: Rule, changes: string, author: string): Promise<Rule>;
    /**
     * 규칙 변경 이력 조회
     */
    getHistory(ruleId: string): Promise<ChangelogEntry[]>;
    /**
     * 두 버전 간 차이점 비교
     */
    diff(ruleId: string, fromVersion: string, toVersion: string): Promise<RuleDiff>;
    /**
     * 특정 버전으로 롤백
     */
    rollback(ruleId: string, targetVersion: string): Promise<Rule>;
    /**
     * 버전 번호 유효성 검사
     */
    validateVersion(version: string): boolean;
    /**
     * 버전 증가
     */
    incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string;
    /**
     * 버전 비교 (-1: a < b, 0: a == b, 1: a > b)
     */
    compareVersions(a: string, b: string): number;
    /**
     * 규칙 스냅샷 저장
     */
    private saveSnapshot;
    /**
     * 규칙의 스냅샷 생성 (메타데이터 제외)
     */
    private createSnapshot;
    /**
     * 두 규칙 비교하여 변경 사항 추출
     */
    private compareRules;
    /**
     * 깊은 비교
     */
    private deepEqual;
}
/**
 * 버전 문자열 파싱
 */
export declare function parseVersion(version: string): {
    major: number;
    minor: number;
    patch: number;
} | null;
/**
 * 규칙에 버전 메타데이터 초기화
 */
export declare function initializeVersioning(rule: Rule, author?: string): Rule;
/**
 * Diff를 포맷된 문자열로 변환
 */
export declare function formatDiff(diff: RuleDiff): string;
export default RuleVersioning;
//# sourceMappingURL=rule-versioning.d.ts.map