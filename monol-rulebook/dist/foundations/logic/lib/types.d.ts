/**
 * Monol Rulebook - Type Definitions
 */
export type Severity = 'error' | 'warning' | 'info';
export type Scope = 'global' | 'project' | 'package';
export type MergeStrategy = 'override' | 'merge' | 'append';
export type ConflictResolution = 'local-wins' | 'parent-wins' | 'manual';
export type RuleStatus = 'draft' | 'active' | 'deprecated';
export type Environment = 'development' | 'staging' | 'production';
/** 규칙 변경 이력 항목 */
export interface ChangelogEntry {
    /** 버전 번호 (semver) */
    version: string;
    /** 변경 일시 (ISO 8601) */
    date: string;
    /** 변경 작성자 */
    author: string;
    /** 변경 내용 요약 */
    changes: string;
    /** 이전 규칙 스냅샷 (롤백용) */
    snapshot?: Partial<Rule>;
}
/** 규칙 메타데이터 */
export interface RuleMetadata {
    /** 규칙 작성자 */
    author?: string;
    /** 리뷰어 */
    reviewedBy?: string;
    /** 규칙 상태 */
    status: RuleStatus;
    /** 현재 버전 */
    version: string;
    /** 변경 이력 */
    changelog?: ChangelogEntry[];
    /** 승인일 */
    approvedAt?: string;
    /** 폐기 예정일 (deprecated인 경우) */
    deprecatedAt?: string;
    /** 폐기 사유 */
    deprecationReason?: string;
}
/** 규칙 의존성 정의 */
export interface RuleDependencies {
    /** 이 규칙 적용 전 필요한 규칙들 */
    requires?: string[];
    /** 이 규칙과 충돌하는 규칙들 (동시 적용 불가) */
    conflicts?: string[];
    /** 상속받는 규칙 ID (부모 규칙의 설정 상속) */
    extends?: string;
    /** 이 규칙을 대체하는 규칙 (deprecated 시) */
    replacedBy?: string;
}
/** 규칙 조건부 적용 설정 */
export interface RuleCondition {
    /** 적용할 파일 패턴 (glob) */
    filePatterns?: string[];
    /** 제외할 파일 패턴 (glob) */
    excludePatterns?: string[];
    /** 적용할 Git 브랜치 */
    branches?: string[];
    /** 적용할 환경 */
    environments?: Environment[];
    /** 적용 시작일 */
    activeFrom?: string;
    /** 적용 종료일 */
    activeUntil?: string;
}
/** 의존성 그래프 노드 */
export interface DependencyNode {
    ruleId: string;
    requires: string[];
    conflicts: string[];
    extends?: string;
}
/** 의존성 그래프 */
export interface DependencyGraph {
    nodes: Map<string, DependencyNode>;
    /** 순환 의존성 경로 */
    cycles: string[][];
    /** 충돌 규칙 쌍 */
    conflictPairs: [string, string][];
}
/** 충돌 리포트 */
export interface ConflictReport {
    hasConflicts: boolean;
    conflicts: ConflictDetail[];
}
/** 충돌 상세 */
export interface ConflictDetail {
    ruleA: string;
    ruleB: string;
    reason: 'explicit' | 'mutual' | 'transitive';
    path?: string[];
}
/** 규칙 변경 비교 결과 */
export interface RuleDiff {
    ruleId: string;
    fromVersion: string;
    toVersion: string;
    changes: DiffChange[];
}
/** 개별 변경 항목 */
export interface DiffChange {
    field: string;
    oldValue: unknown;
    newValue: unknown;
    type: 'added' | 'removed' | 'modified';
}
export interface RuleExamples {
    good: string[];
    bad: string[];
}
export interface Rule {
    /** 고유 식별자 (예: naming-001) */
    id: string;
    /** 규칙 이름 */
    name: string;
    /** 상세 설명 */
    description: string;
    /** 카테고리 경로 (예: code/naming) */
    category: string;
    /** 태그 목록 */
    tags: string[];
    /** 심각도 */
    severity: Severity;
    /** 예시 코드 */
    examples?: RuleExamples;
    /** 예외 상황 설명 */
    exceptions?: string[];
    /** 관련 규칙 ID 목록 */
    related?: string[];
    /** 생성일 (ISO 8601) */
    created: string;
    /** 수정일 (ISO 8601) */
    updated: string;
    /** 적용 범위 */
    scope?: Scope;
    /** 출처 (파일 경로 또는 URL) */
    source?: string;
    /** 활성화 여부 */
    enabled?: boolean;
    /** 자동 적용 여부 */
    autoApply?: boolean;
    /** 플랫폼별 설정 */
    platforms?: PlatformConfig;
    /** 규칙 메타데이터 (버전, 작성자, 상태) */
    metadata?: RuleMetadata;
    /** 규칙 의존성 (requires, conflicts, extends) */
    dependencies?: RuleDependencies;
    /** 조건부 적용 설정 */
    conditions?: RuleCondition;
}
export interface IndexMetadata {
    version: string;
    lastUpdated: string;
    scope: Scope;
    description?: string;
}
export interface CategoryInfo {
    id: string;
    name: string;
    description?: string;
    ruleCount: number;
    subcategories?: CategoryInfo[];
}
export interface RuleRef {
    id: string;
    file: string;
    category: string;
    tags: string[];
}
export interface RuleIndex {
    metadata: IndexMetadata;
    categories: CategoryInfo[];
    tags: string[];
    rules: RuleRef[];
}
export interface ConfigMetadata {
    version: string;
    scope: Scope;
    parentScope?: string;
}
export interface HierarchyConfig {
    enabled: boolean;
    mergeStrategy: MergeStrategy;
    conflictResolution: ConflictResolution;
}
export interface InheritanceEntry {
    path: string;
    priority: number;
}
export interface RulebookConfig {
    metadata: ConfigMetadata;
    hierarchy: HierarchyConfig;
    inheritance: InheritanceEntry[];
}
export interface PlatformConfig {
    cursor?: CursorConfig;
    claude?: ClaudeConfig;
}
export interface CursorConfig {
    enabled: boolean;
    includeInRules: boolean;
}
export interface ClaudeConfig {
    enabled: boolean;
    ruleFile?: string;
}
export interface PlatformAdapter {
    name: string;
    /** 현재 플랫폼 규칙 읽기 */
    read(): Promise<string>;
    /** 규칙을 플랫폼 포맷으로 변환 */
    format(rules: Rule[]): string;
    /** 플랫폼에 규칙 쓰기 */
    write(content: string): Promise<void>;
    /** 동기화 실행 */
    sync(rules: Rule[]): Promise<SyncResult>;
}
export interface SyncResult {
    success: boolean;
    platform: string;
    rulesCount: number;
    outputPath: string;
    error?: string;
}
/** 양방향 동기화 방향 */
export type SyncDirection = 'push' | 'pull' | 'both';
/** 양방향 동기화 결과 */
export interface BidirectionalSyncResult {
    success: boolean;
    direction: SyncDirection;
    platform: string;
    /** Push 결과 (rules → platform) */
    pushed?: {
        count: number;
        rules: string[];
    };
    /** Pull 결과 (platform → rules) */
    pulled?: {
        count: number;
        rules: string[];
        newRules: string[];
        updatedRules: string[];
    };
    /** 충돌 목록 */
    conflicts?: SyncConflict[];
    error?: string;
}
/** 동기화 충돌 */
export interface SyncConflict {
    ruleId: string;
    localVersion: string;
    remoteVersion: string;
    field: string;
    localValue: unknown;
    remoteValue: unknown;
    resolution?: 'local' | 'remote' | 'merge' | 'skip';
}
/** 동기화 Diff 결과 */
export interface SyncDiffResult {
    platform: string;
    /** 로컬에만 있는 규칙 */
    localOnly: string[];
    /** 플랫폼에만 있는 규칙 */
    remoteOnly: string[];
    /** 양쪽에 있지만 다른 규칙 */
    different: {
        ruleId: string;
        differences: DiffChange[];
    }[];
    /** 동일한 규칙 */
    identical: string[];
}
export interface SearchOptions {
    /** 태그 필터 */
    tags?: string[];
    /** 카테고리 필터 */
    category?: string;
    /** 심각도 필터 */
    severity?: Severity;
    /** 키워드 검색 */
    keyword?: string;
    /** 최대 결과 수 */
    limit?: number;
    /** 활성화된 규칙만 */
    enabledOnly?: boolean;
    /** 규칙 상태 필터 */
    status?: RuleStatus;
    /** 특정 규칙에 의존하는 규칙 찾기 */
    dependsOn?: string;
    /** 특정 규칙과 충돌하는 규칙 찾기 */
    conflictsWith?: string;
    /** 파일 패턴에 해당하는 규칙 찾기 */
    forFile?: string;
    /** 환경에 해당하는 규칙 찾기 */
    forEnvironment?: Environment;
}
export interface SearchResult {
    rule: Rule;
    score: number;
    matchedFields: string[];
}
export interface SimilarityResult {
    rule: Rule;
    similarity: number;
    matchingAspects: string[];
}
export interface LoadResult {
    rules: Rule[];
    sources: string[];
    errors: LoadError[];
}
export interface LoadError {
    file: string;
    message: string;
}
export interface SaveResult {
    success: boolean;
    path: string;
    error?: string;
}
export interface MergeResult {
    rules: Rule[];
    conflicts: MergeConflict[];
}
export interface MergeConflict {
    ruleId: string;
    sources: string[];
    resolution: 'auto' | 'manual';
    winner?: string;
}
export interface RuleEvent {
    type: 'added' | 'updated' | 'deleted' | 'synced';
    ruleId: string;
    timestamp: string;
    details?: Record<string, unknown>;
}
export type RuleMap = Map<string, Rule>;
export type CategoryMap = Map<string, Rule[]>;
export type TagIndex = Map<string, Set<string>>;
//# sourceMappingURL=types.d.ts.map