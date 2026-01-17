/**
 * Monol Rulebook - Rule Search
 *
 * 태그, 키워드, 의미 기반 규칙 검색
 */
import type { Rule, SearchOptions, SearchResult, SimilarityResult } from './types.js';
export declare class RuleSearch {
    private rules;
    private tagIndex;
    private keywordIndex;
    constructor(rules?: Rule[]);
    /**
     * 규칙 목록 업데이트
     */
    updateRules(rules: Rule[]): void;
    /**
     * 태그 기반 검색
     */
    searchByTags(tags: string[], matchAll?: boolean): Rule[];
    /**
     * 키워드 검색
     */
    searchByKeyword(keyword: string): SearchResult[];
    /**
     * 복합 검색
     */
    search(options: SearchOptions): SearchResult[];
    /**
     * 유사 규칙 찾기 (중복 감지)
     */
    findSimilar(rule: Rule, threshold?: number): SimilarityResult[];
    /**
     * 유사도 계산
     */
    calculateSimilarity(a: Rule, b: Rule): number;
    /**
     * 태그 자동완성
     */
    suggestTags(prefix: string): string[];
    /**
     * 카테고리 목록
     */
    getCategories(): string[];
    /**
     * 모든 태그 목록
     */
    getAllTags(): string[];
    private buildIndices;
    private extractWords;
    private calculateKeywordScore;
    private getMatchedFields;
    private getMatchingAspects;
    /**
     * 문자열 유사도 (Levenshtein distance 기반)
     */
    private stringSimilarity;
    private getNgrams;
    /**
     * Jaccard 유사도
     */
    private jaccardSimilarity;
    /**
     * 카테고리 유사도
     */
    private categorySimilarity;
}
/**
 * 빠른 태그 검색
 */
export declare function quickSearchByTags(rules: Rule[], tags: string[]): Rule[];
/**
 * 빠른 카테고리 검색
 */
export declare function quickSearchByCategory(rules: Rule[], category: string): Rule[];
/**
 * 규칙 그룹화
 */
export declare function groupRulesByCategory(rules: Rule[]): Map<string, Rule[]>;
/**
 * 규칙 통계
 */
export declare function getRuleStats(rules: Rule[]): {
    total: number;
    byCategory: Map<string, number>;
    bySeverity: Map<string, number>;
    byTag: Map<string, number>;
};
export default RuleSearch;
//# sourceMappingURL=rule-search.d.ts.map