/**
 * Monol Rulebook - Error Classes
 *
 * 구조화된 에러 클래스로 디버깅 정보 개선
 */
export interface ErrorContext {
    file?: string;
    line?: number;
    column?: number;
    snippet?: string;
    suggestion?: string;
    docs?: string;
}
/**
 * Rulebook 기본 에러 클래스
 */
export declare class RulebookError extends Error {
    readonly code: string;
    readonly context: ErrorContext;
    readonly timestamp: string;
    constructor(code: string, message: string, context?: ErrorContext);
    /**
     * 에러 정보를 포맷된 문자열로 반환
     */
    format(): string;
    /**
     * JSON 직렬화용
     */
    toJSON(): Record<string, unknown>;
}
/**
 * YAML 파싱 에러
 */
export declare class YAMLParseError extends RulebookError {
    constructor(message: string, file: string, options?: {
        line?: number;
        column?: number;
        snippet?: string;
        yamlError?: Error;
    });
    /**
     * yaml 라이브러리 에러에서 YAMLParseError 생성
     */
    static fromYAMLError(error: Error, file: string, content?: string): YAMLParseError;
}
/**
 * 규칙 유효성 검사 에러
 */
export declare class ValidationError extends RulebookError {
    readonly field?: string;
    readonly expected?: string;
    readonly received?: string;
    constructor(message: string, options?: {
        file?: string;
        field?: string;
        expected?: string;
        received?: string;
        ruleId?: string;
    });
    /**
     * 필수 필드 누락 에러
     */
    static missingRequired(field: string, file?: string, ruleId?: string): ValidationError;
    /**
     * 잘못된 타입 에러
     */
    static invalidType(field: string, expected: string, received: string, file?: string): ValidationError;
    /**
     * 잘못된 값 에러
     */
    static invalidValue(field: string, expected: string, received: string, file?: string): ValidationError;
}
/**
 * 의존성 관련 에러
 */
export declare class DependencyError extends RulebookError {
    readonly cycle?: string[];
    readonly missingDependencies?: string[];
    readonly conflicts?: [string, string][];
    constructor(message: string, options?: {
        file?: string;
        cycle?: string[];
        missingDependencies?: string[];
        conflicts?: [string, string][];
    });
    /**
     * 순환 의존성 에러
     */
    static circularDependency(cycle: string[]): DependencyError;
    /**
     * 누락된 의존성 에러
     */
    static missingDependency(ruleId: string, missing: string[]): DependencyError;
    /**
     * 규칙 충돌 에러
     */
    static ruleConflict(ruleA: string, ruleB: string): DependencyError;
}
/**
 * 동기화 관련 에러
 */
export declare class SyncError extends RulebookError {
    readonly platform?: string;
    readonly direction?: 'push' | 'pull';
    constructor(message: string, options?: {
        platform?: string;
        direction?: 'push' | 'pull';
        file?: string;
    });
    /**
     * 플랫폼 파싱 에러
     */
    static parseError(platform: string, file: string, details?: string): SyncError;
    /**
     * 쓰기 에러
     */
    static writeError(platform: string, file: string, reason?: string): SyncError;
}
/**
 * 버전 관련 에러
 */
export declare class VersionError extends RulebookError {
    readonly ruleId?: string;
    readonly version?: string;
    constructor(message: string, options?: {
        ruleId?: string;
        version?: string;
        file?: string;
    });
    /**
     * 버전을 찾을 수 없음
     */
    static notFound(ruleId: string, version: string): VersionError;
    /**
     * 잘못된 버전 형식
     */
    static invalidFormat(version: string): VersionError;
}
/**
 * 에러가 RulebookError인지 확인
 */
export declare function isRulebookError(error: unknown): error is RulebookError;
/**
 * 에러 코드로 분류
 */
export declare function categorizeError(error: unknown): string;
/**
 * 에러를 사용자 친화적 메시지로 변환
 */
export declare function formatError(error: unknown): string;
declare const _default: {
    RulebookError: typeof RulebookError;
    YAMLParseError: typeof YAMLParseError;
    ValidationError: typeof ValidationError;
    DependencyError: typeof DependencyError;
    SyncError: typeof SyncError;
    VersionError: typeof VersionError;
    isRulebookError: typeof isRulebookError;
    categorizeError: typeof categorizeError;
    formatError: typeof formatError;
};
export default _default;
//# sourceMappingURL=errors.d.ts.map