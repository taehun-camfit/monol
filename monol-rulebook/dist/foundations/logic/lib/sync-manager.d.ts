/**
 * Monol Rulebook - Sync Manager
 *
 * 플랫폼 간 양방향 동기화 관리
 */
import type { Rule, SyncDirection, BidirectionalSyncResult, SyncConflict, SyncDiffResult } from './types.js';
export declare class SyncManager {
    private basePath;
    private manager;
    constructor(basePath: string);
    /**
     * 플랫폼에서 규칙 가져오기 (Pull)
     */
    pullFromPlatform(platformName: string): Promise<Rule[]>;
    /**
     * 양방향 동기화 실행
     */
    sync(platformName: string, direction?: SyncDirection): Promise<BidirectionalSyncResult>;
    /**
     * 로컬과 플랫폼 간 차이점 비교
     */
    diff(platformName: string): Promise<SyncDiffResult>;
    /**
     * 양방향 병합
     */
    merge(localRules: Rule[], remoteRules: Rule[]): {
        merged: Rule[];
        conflicts: SyncConflict[];
    };
    /**
     * 충돌 해결
     */
    resolveConflicts(conflicts: SyncConflict[], resolution: 'local' | 'remote' | 'manual'): SyncConflict[];
    /**
     * 플랫폼별 콘텐츠 파싱
     */
    private parsePlatformContent;
    /**
     * Cursor .cursorrules 파싱
     */
    private parseCursorContent;
    /**
     * Claude .claude/rules/ 파싱
     */
    private parseClaudeContent;
    /**
     * Claude 섹션 파싱
     */
    private parseClaudeSection;
    /**
     * 부분 규칙을 완전한 규칙으로 변환
     */
    private completePartialRule;
    /**
     * 이름에서 ID 생성
     */
    private generateIdFromName;
    /**
     * Pull 결과 적용
     */
    private applyPull;
    /**
     * 동기화 충돌 감지
     */
    private detectSyncConflicts;
    /**
     * 두 규칙 비교
     */
    private compareRules;
}
/**
 * Diff 결과 포맷
 */
export declare function formatSyncDiff(diff: SyncDiffResult): string;
/**
 * 충돌 포맷
 */
export declare function formatConflicts(conflicts: SyncConflict[]): string;
export default SyncManager;
//# sourceMappingURL=sync-manager.d.ts.map