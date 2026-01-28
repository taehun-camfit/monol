/**
 * Monol Rulebook - Rulebook Manager
 *
 * 규칙 로드, 저장, 계층 병합을 담당하는 핵심 매니저
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as YAML from 'yaml';
import { DependencyError, YAMLParseError } from './errors.js';
import { getServerSync, loadConfigFromEnv } from './server-sync.js';
// ============================================================================
// Constants
// ============================================================================
const RULES_DIR = 'rules';
const INDEX_FILE = 'index.yaml';
const CONFIG_FILE = '.rulebook-config.yaml';
const DEFAULT_CONFIG = {
    metadata: {
        version: '1.0.0',
        scope: 'package',
    },
    hierarchy: {
        enabled: true,
        mergeStrategy: 'override',
        conflictResolution: 'local-wins',
    },
    inheritance: [],
};
// ============================================================================
// RulebookManager Class
// ============================================================================
export class RulebookManager {
    basePath;
    config;
    rulesCache = new Map();
    constructor(basePath) {
        this.basePath = basePath || process.cwd();
        this.config = DEFAULT_CONFIG;
    }
    // --------------------------------------------------------------------------
    // Public API
    // --------------------------------------------------------------------------
    /**
     * 특정 경로에 대한 계층적 규칙 로드
     */
    async loadRulesForPath(targetPath) {
        const errors = [];
        const sources = [];
        let rules = [];
        // 1. 설정 로드
        await this.loadConfig(targetPath);
        // 2. 계층 구조가 활성화된 경우 상위 규칙 먼저 로드
        if (this.config.hierarchy.enabled) {
            for (const inherit of this.config.inheritance) {
                const inheritPath = this.resolvePath(inherit.path, targetPath);
                try {
                    const inheritResult = await this.loadRulesFromDirectory(inheritPath);
                    rules = [...rules, ...inheritResult.rules];
                    sources.push(inheritPath);
                    errors.push(...inheritResult.errors);
                }
                catch (e) {
                    // 상속 경로가 없어도 에러가 아님
                }
            }
        }
        // 3. 현재 경로 규칙 로드
        const rulesPath = path.join(targetPath, RULES_DIR);
        try {
            const localResult = await this.loadRulesFromDirectory(rulesPath);
            rules = [...rules, ...localResult.rules];
            sources.push(rulesPath);
            errors.push(...localResult.errors);
        }
        catch (e) {
            errors.push({
                file: rulesPath,
                message: `Failed to load rules directory: ${e}`,
            });
        }
        // 4. 규칙 병합
        const merged = this.mergeRules(rules);
        // 캐시 업데이트
        for (const rule of merged.rules) {
            this.rulesCache.set(rule.id, rule);
        }
        return {
            rules: merged.rules,
            sources,
            errors: [...errors, ...merged.conflicts.map(c => ({
                    file: c.sources.join(', '),
                    message: `Conflict on rule ${c.ruleId}: ${c.resolution}`,
                }))],
        };
    }
    /**
     * 단일 규칙 저장
     */
    async saveRule(rule, targetPath) {
        const basePath = targetPath || this.basePath;
        const rulesPath = path.join(basePath, RULES_DIR);
        // 카테고리 경로 생성
        const categoryPath = rule.category.replace(/\//g, path.sep);
        const dirPath = path.join(rulesPath, path.dirname(categoryPath));
        const fileName = `${rule.id.split('-')[0]}.yaml`;
        const filePath = path.join(dirPath, fileName);
        // 신규인지 업데이트인지 확인
        const isNew = !this.rulesCache.has(rule.id);
        try {
            // 디렉토리 생성
            await fs.mkdir(dirPath, { recursive: true });
            // 규칙 저장
            const content = YAML.stringify(rule);
            await fs.writeFile(filePath, content, 'utf-8');
            // 캐시 업데이트
            this.rulesCache.set(rule.id, rule);
            // 인덱스 업데이트
            await this.updateIndex(basePath);
            // 서버 동기화 (best-effort, 실패해도 저장은 성공)
            try {
                const serverSync = getServerSync(loadConfigFromEnv());
                if (isNew) {
                    await serverSync.syncRuleAdded(rule);
                }
                else {
                    await serverSync.syncRuleUpdated(rule);
                }
            }
            catch {
                // 서버 동기화 실패는 무시
            }
            return {
                success: true,
                path: filePath,
            };
        }
        catch (e) {
            return {
                success: false,
                path: filePath,
                error: String(e),
            };
        }
    }
    /**
     * 인덱스 업데이트
     */
    async updateIndex(targetPath) {
        const basePath = targetPath || this.basePath;
        const rulesPath = path.join(basePath, RULES_DIR);
        const indexPath = path.join(rulesPath, INDEX_FILE);
        // 모든 규칙 로드
        const result = await this.loadRulesFromDirectory(rulesPath);
        const rules = result.rules;
        // 카테고리 및 태그 집계
        const categories = this.aggregateCategories(rules);
        const tags = this.aggregateTags(rules);
        const ruleRefs = rules.map(r => ({
            id: r.id,
            file: `${r.category.split('/').pop()}.yaml`,
            category: r.category,
            tags: r.tags,
        }));
        const index = {
            metadata: {
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                scope: this.config.metadata.scope,
            },
            categories,
            tags,
            rules: ruleRefs,
        };
        await fs.writeFile(indexPath, YAML.stringify(index), 'utf-8');
    }
    /**
     * 규칙 병합
     */
    mergeRules(rules) {
        const ruleMap = new Map();
        const conflicts = [];
        for (const rule of rules) {
            const existing = ruleMap.get(rule.id);
            const source = rule.source || 'unknown';
            if (existing) {
                // 충돌 발생
                const resolution = this.resolveConflict(existing.rule, rule);
                conflicts.push({
                    ruleId: rule.id,
                    sources: [...existing.sources, source],
                    resolution: 'auto',
                    winner: resolution === 'new' ? source : existing.sources[0],
                });
                if (resolution === 'new') {
                    ruleMap.set(rule.id, { rule, sources: [...existing.sources, source] });
                }
            }
            else {
                ruleMap.set(rule.id, { rule, sources: [source] });
            }
        }
        return {
            rules: Array.from(ruleMap.values()).map(v => v.rule),
            conflicts,
        };
    }
    /**
     * 규칙 가져오기
     */
    getRule(id) {
        return this.rulesCache.get(id);
    }
    /**
     * 모든 규칙 가져오기
     */
    getAllRules() {
        return Array.from(this.rulesCache.values());
    }
    /**
     * 카테고리별 규칙 가져오기
     */
    getRulesByCategory(category) {
        return this.getAllRules().filter(r => r.category.startsWith(category));
    }
    // --------------------------------------------------------------------------
    // Dependency Management
    // --------------------------------------------------------------------------
    /**
     * 의존성 그래프 구축
     */
    buildDependencyGraph() {
        const nodes = new Map();
        const rules = this.getAllRules();
        // 1. 노드 생성
        for (const rule of rules) {
            nodes.set(rule.id, {
                ruleId: rule.id,
                requires: rule.dependencies?.requires || [],
                conflicts: rule.dependencies?.conflicts || [],
                extends: rule.dependencies?.extends,
            });
        }
        // 2. 순환 의존성 감지
        const cycles = this.findCycles(nodes);
        // 3. 충돌 쌍 수집
        const conflictPairs = [];
        for (const [ruleId, node] of nodes) {
            for (const conflictId of node.conflicts) {
                // 중복 방지 (a-b와 b-a는 같은 쌍)
                const pair = ruleId < conflictId
                    ? [ruleId, conflictId]
                    : [conflictId, ruleId];
                const key = pair.join('-');
                if (!conflictPairs.some(p => p.join('-') === key)) {
                    conflictPairs.push(pair);
                }
            }
        }
        return { nodes, cycles, conflictPairs };
    }
    /**
     * 순환 의존성 감지
     */
    detectCircularDependencies() {
        const graph = this.buildDependencyGraph();
        return graph.cycles;
    }
    /**
     * 의존성 순서로 규칙 정렬 (위상 정렬)
     */
    sortByDependencies(rules) {
        const ruleMap = new Map(rules.map(r => [r.id, r]));
        const visited = new Set();
        const result = [];
        const visit = (ruleId, stack = new Set()) => {
            if (visited.has(ruleId))
                return;
            if (stack.has(ruleId)) {
                // 순환 의존성 - 일단 건너뜀
                return;
            }
            const rule = ruleMap.get(ruleId);
            if (!rule)
                return;
            stack.add(ruleId);
            // 의존하는 규칙들 먼저 방문
            const requires = rule.dependencies?.requires || [];
            for (const reqId of requires) {
                visit(reqId, stack);
            }
            // extends도 먼저 방문
            if (rule.dependencies?.extends) {
                visit(rule.dependencies.extends, stack);
            }
            stack.delete(ruleId);
            visited.add(ruleId);
            result.push(rule);
        };
        for (const rule of rules) {
            visit(rule.id);
        }
        return result;
    }
    /**
     * 규칙 충돌 검사
     */
    checkConflicts(rules) {
        const targetRules = rules || this.getAllRules();
        const ruleIds = new Set(targetRules.map(r => r.id));
        const conflicts = [];
        for (const rule of targetRules) {
            const conflictsWith = rule.dependencies?.conflicts || [];
            for (const conflictId of conflictsWith) {
                // 충돌 대상이 현재 규칙셋에 있는지 확인
                if (ruleIds.has(conflictId)) {
                    conflicts.push({
                        ruleA: rule.id,
                        ruleB: conflictId,
                        reason: 'explicit',
                    });
                }
            }
        }
        // 상호 충돌 검사 (A가 B와 충돌하면 B도 A와 충돌)
        for (const rule of targetRules) {
            for (const otherRule of targetRules) {
                if (rule.id === otherRule.id)
                    continue;
                const aConflicts = rule.dependencies?.conflicts || [];
                const bConflicts = otherRule.dependencies?.conflicts || [];
                // 상호 충돌 선언 확인
                if (aConflicts.includes(otherRule.id) && bConflicts.includes(rule.id)) {
                    // 이미 추가되지 않았으면 추가
                    const exists = conflicts.some(c => (c.ruleA === rule.id && c.ruleB === otherRule.id) ||
                        (c.ruleA === otherRule.id && c.ruleB === rule.id));
                    if (!exists) {
                        conflicts.push({
                            ruleA: rule.id,
                            ruleB: otherRule.id,
                            reason: 'mutual',
                        });
                    }
                }
            }
        }
        return {
            hasConflicts: conflicts.length > 0,
            conflicts,
        };
    }
    /**
     * 규칙 의존성 유효성 검사
     */
    validateDependencies(rule) {
        const errors = [];
        const allRuleIds = new Set(this.getAllRules().map(r => r.id));
        // 1. requires 검사 - 필요한 규칙이 존재하는지
        const requires = rule.dependencies?.requires || [];
        const missingRequired = requires.filter(id => !allRuleIds.has(id));
        if (missingRequired.length > 0) {
            errors.push(DependencyError.missingDependency(rule.id, missingRequired));
        }
        // 2. extends 검사 - 상속 대상이 존재하는지
        if (rule.dependencies?.extends && !allRuleIds.has(rule.dependencies.extends)) {
            errors.push(DependencyError.missingDependency(rule.id, [rule.dependencies.extends]));
        }
        // 3. 자기 참조 검사
        if (requires.includes(rule.id)) {
            errors.push(DependencyError.circularDependency([rule.id, rule.id]));
        }
        // 4. 충돌 규칙 검사 - 활성화된 충돌 규칙이 있는지
        const conflictsWith = rule.dependencies?.conflicts || [];
        const activeConflicts = conflictsWith.filter(id => {
            const conflictRule = this.getRule(id);
            return conflictRule?.enabled !== false;
        });
        if (activeConflicts.length > 0) {
            for (const conflictId of activeConflicts) {
                errors.push(DependencyError.ruleConflict(rule.id, conflictId));
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * 모든 규칙의 의존성 검증
     */
    validateAllDependencies() {
        const allErrors = [];
        // 1. 개별 규칙 의존성 검사
        for (const rule of this.getAllRules()) {
            const result = this.validateDependencies(rule);
            allErrors.push(...result.errors);
        }
        // 2. 순환 의존성 검사
        const cycles = this.detectCircularDependencies();
        for (const cycle of cycles) {
            allErrors.push(DependencyError.circularDependency(cycle));
        }
        return {
            valid: allErrors.length === 0,
            errors: allErrors,
        };
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    /**
     * 그래프에서 순환 찾기 (DFS)
     */
    findCycles(nodes) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];
        const dfs = (nodeId) => {
            if (recursionStack.has(nodeId)) {
                // 순환 발견
                const cycleStart = path.indexOf(nodeId);
                if (cycleStart !== -1) {
                    const cycle = [...path.slice(cycleStart), nodeId];
                    cycles.push(cycle);
                }
                return;
            }
            if (visited.has(nodeId))
                return;
            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);
            const node = nodes.get(nodeId);
            if (node) {
                // requires 따라가기
                for (const reqId of node.requires) {
                    if (nodes.has(reqId)) {
                        dfs(reqId);
                    }
                }
                // extends 따라가기
                if (node.extends && nodes.has(node.extends)) {
                    dfs(node.extends);
                }
            }
            path.pop();
            recursionStack.delete(nodeId);
        };
        for (const nodeId of nodes.keys()) {
            if (!visited.has(nodeId)) {
                dfs(nodeId);
            }
        }
        return cycles;
    }
    async loadConfig(basePath) {
        const configPath = path.join(basePath, RULES_DIR, CONFIG_FILE);
        try {
            const content = await fs.readFile(configPath, 'utf-8');
            const parsed = YAML.parse(content);
            this.config = {
                ...DEFAULT_CONFIG,
                ...parsed,
                metadata: { ...DEFAULT_CONFIG.metadata, ...parsed.metadata },
                hierarchy: { ...DEFAULT_CONFIG.hierarchy, ...parsed.hierarchy },
            };
        }
        catch {
            // 설정 파일이 없으면 기본값 사용
            this.config = DEFAULT_CONFIG;
        }
    }
    async loadRulesFromDirectory(dirPath) {
        const rules = [];
        const errors = [];
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    // 재귀적으로 하위 디렉토리 로드
                    const subResult = await this.loadRulesFromDirectory(entryPath);
                    rules.push(...subResult.rules);
                    errors.push(...subResult.errors);
                }
                else if (entry.name.endsWith('.yaml') && entry.name !== INDEX_FILE && entry.name !== CONFIG_FILE) {
                    // YAML 파일 파싱
                    try {
                        const content = await fs.readFile(entryPath, 'utf-8');
                        const parsed = YAML.parse(content);
                        // 여러 규칙이 하나의 파일에 있을 수 있음
                        if (Array.isArray(parsed)) {
                            for (const rule of parsed) {
                                rules.push({ ...rule, source: entryPath });
                            }
                        }
                        else if (parsed.id) {
                            rules.push({ ...parsed, source: entryPath });
                        }
                    }
                    catch (e) {
                        // 상세한 YAML 파싱 에러 생성
                        const content = await fs.readFile(entryPath, 'utf-8').catch(() => undefined);
                        const yamlError = YAMLParseError.fromYAMLError(e instanceof Error ? e : new Error(String(e)), entryPath, content);
                        errors.push({
                            file: entryPath,
                            message: yamlError.format(),
                        });
                    }
                }
            }
        }
        catch (e) {
            errors.push({
                file: dirPath,
                message: `Failed to read directory: ${e}`,
            });
        }
        return { rules, sources: [dirPath], errors };
    }
    resolvePath(targetPath, basePath) {
        if (targetPath.startsWith('~')) {
            return path.join(process.env.HOME || '', targetPath.slice(1));
        }
        if (path.isAbsolute(targetPath)) {
            return targetPath;
        }
        return path.resolve(basePath, targetPath);
    }
    resolveConflict(existing, newer) {
        const strategy = this.config.hierarchy.conflictResolution;
        switch (strategy) {
            case 'local-wins':
                return 'new';
            case 'parent-wins':
                return 'existing';
            default:
                // 최신 업데이트 기준
                return new Date(newer.updated) > new Date(existing.updated) ? 'new' : 'existing';
        }
    }
    aggregateCategories(rules) {
        const categoryMap = new Map();
        for (const rule of rules) {
            const parts = rule.category.split('/');
            const rootCategory = parts[0];
            if (!categoryMap.has(rootCategory)) {
                categoryMap.set(rootCategory, { name: rootCategory, count: 0, subs: new Map() });
            }
            const cat = categoryMap.get(rootCategory);
            cat.count++;
            if (parts.length > 1) {
                const subCategory = parts.slice(0, 2).join('/');
                cat.subs.set(subCategory, (cat.subs.get(subCategory) || 0) + 1);
            }
        }
        return Array.from(categoryMap.entries()).map(([id, data]) => ({
            id,
            name: data.name,
            ruleCount: data.count,
            subcategories: Array.from(data.subs.entries()).map(([subId, count]) => ({
                id: subId,
                name: subId.split('/').pop() || subId,
                ruleCount: count,
            })),
        }));
    }
    aggregateTags(rules) {
        const tagSet = new Set();
        for (const rule of rules) {
            for (const tag of rule.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort();
    }
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * 규칙 ID 생성
 */
export function generateRuleId(category, existingIds) {
    const prefix = category.split('/').pop() || 'rule';
    let counter = 1;
    while (existingIds.includes(`${prefix}-${String(counter).padStart(3, '0')}`)) {
        counter++;
    }
    return `${prefix}-${String(counter).padStart(3, '0')}`;
}
/**
 * 규칙 유효성 검사
 */
export function validateRule(rule) {
    const errors = [];
    if (!rule.id)
        errors.push('Rule ID is required');
    if (!rule.name)
        errors.push('Rule name is required');
    if (!rule.description)
        errors.push('Rule description is required');
    if (!rule.category)
        errors.push('Rule category is required');
    if (!rule.tags || rule.tags.length === 0)
        errors.push('At least one tag is required');
    if (!rule.severity)
        errors.push('Severity is required');
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * 규칙 템플릿 생성
 */
export function createRuleTemplate(id, name, category) {
    const now = new Date().toISOString();
    return {
        id,
        name,
        description: '',
        category,
        tags: [],
        severity: 'info',
        created: now,
        updated: now,
        scope: 'package',
        enabled: true,
    };
}
export default RulebookManager;
//# sourceMappingURL=rulebook-manager.js.map