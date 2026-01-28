/**
 * Monol Rulebook - Sync Manager
 *
 * 플랫폼 간 양방향 동기화 관리
 */
import { SyncError } from './errors.js';
import { getAdapter } from './adapters/platform-adapter.js';
import RulebookManager from './rulebook-manager.js';
import { getServerSync, loadConfigFromEnv } from './server-sync.js';
// ============================================================================
// SyncManager Class
// ============================================================================
export class SyncManager {
    basePath;
    manager;
    constructor(basePath) {
        this.basePath = basePath;
        this.manager = new RulebookManager(basePath);
    }
    // --------------------------------------------------------------------------
    // Public API
    // --------------------------------------------------------------------------
    /**
     * 플랫폼에서 규칙 가져오기 (Pull)
     */
    async pullFromPlatform(platformName) {
        const adapter = getAdapter(platformName, this.basePath);
        if (!adapter) {
            throw new SyncError(`Unknown platform: ${platformName}`, { platform: platformName });
        }
        const content = await adapter.read();
        if (!content) {
            return [];
        }
        // 플랫폼별 파싱
        return this.parsePlatformContent(platformName, content);
    }
    /**
     * 양방향 동기화 실행
     */
    async sync(platformName, direction = 'both') {
        const adapter = getAdapter(platformName, this.basePath);
        if (!adapter) {
            return {
                success: false,
                direction,
                platform: platformName,
                error: `Unknown platform: ${platformName}`,
            };
        }
        // 로컬 규칙 로드
        await this.manager.loadRulesForPath(this.basePath);
        const localRules = this.manager.getAllRules();
        const result = {
            success: true,
            direction,
            platform: platformName,
        };
        try {
            // Pull
            if (direction === 'pull' || direction === 'both') {
                const remoteRules = await this.pullFromPlatform(platformName);
                const pullResult = await this.applyPull(localRules, remoteRules);
                result.pulled = pullResult;
            }
            // Push
            if (direction === 'push' || direction === 'both') {
                const syncResult = await adapter.sync(localRules);
                result.pushed = {
                    count: syncResult.rulesCount,
                    rules: localRules.map(r => r.id),
                };
            }
            // 충돌 검사 (both인 경우)
            if (direction === 'both') {
                const remoteRules = await this.pullFromPlatform(platformName);
                result.conflicts = this.detectSyncConflicts(localRules, remoteRules);
            }
            // 서버에 동기화 이벤트 전송 (best-effort)
            if (result.success) {
                try {
                    const serverSync = getServerSync(loadConfigFromEnv());
                    await serverSync.syncPlatformSync(platformName, localRules.length, direction);
                }
                catch {
                    // 서버 동기화 실패는 무시
                }
            }
        }
        catch (e) {
            result.success = false;
            result.error = e instanceof Error ? e.message : String(e);
        }
        return result;
    }
    /**
     * 로컬과 플랫폼 간 차이점 비교
     */
    async diff(platformName) {
        const adapter = getAdapter(platformName, this.basePath);
        if (!adapter) {
            throw new SyncError(`Unknown platform: ${platformName}`, { platform: platformName });
        }
        // 로컬 규칙 로드
        await this.manager.loadRulesForPath(this.basePath);
        const localRules = this.manager.getAllRules();
        const localMap = new Map(localRules.map(r => [r.id, r]));
        // 플랫폼 규칙 파싱
        const remoteRules = await this.pullFromPlatform(platformName);
        const remoteMap = new Map(remoteRules.map(r => [r.id, r]));
        const localOnly = [];
        const remoteOnly = [];
        const different = [];
        const identical = [];
        // 로컬에만 있는 규칙
        for (const [id] of localMap) {
            if (!remoteMap.has(id)) {
                localOnly.push(id);
            }
        }
        // 플랫폼에만 있는 규칙
        for (const [id] of remoteMap) {
            if (!localMap.has(id)) {
                remoteOnly.push(id);
            }
        }
        // 양쪽에 있는 규칙 비교
        for (const [id, localRule] of localMap) {
            const remoteRule = remoteMap.get(id);
            if (!remoteRule)
                continue;
            const differences = this.compareRules(localRule, remoteRule);
            if (differences.length > 0) {
                different.push({ ruleId: id, differences });
            }
            else {
                identical.push(id);
            }
        }
        return {
            platform: platformName,
            localOnly,
            remoteOnly,
            different,
            identical,
        };
    }
    /**
     * 양방향 병합
     */
    merge(localRules, remoteRules) {
        const mergedMap = new Map();
        const conflicts = [];
        // 로컬 규칙 먼저 추가
        for (const rule of localRules) {
            mergedMap.set(rule.id, rule);
        }
        // 원격 규칙 병합
        for (const remoteRule of remoteRules) {
            const localRule = mergedMap.get(remoteRule.id);
            if (!localRule) {
                // 로컬에 없으면 추가
                mergedMap.set(remoteRule.id, remoteRule);
            }
            else {
                // 양쪽에 있으면 충돌 확인
                const differences = this.compareRules(localRule, remoteRule);
                if (differences.length > 0) {
                    // 충돌 기록
                    for (const diff of differences) {
                        conflicts.push({
                            ruleId: remoteRule.id,
                            localVersion: localRule.metadata?.version || '0.0.0',
                            remoteVersion: remoteRule.metadata?.version || '0.0.0',
                            field: diff.field,
                            localValue: diff.oldValue,
                            remoteValue: diff.newValue,
                        });
                    }
                    // 기본적으로 최신 업데이트 우선
                    if (new Date(remoteRule.updated) > new Date(localRule.updated)) {
                        mergedMap.set(remoteRule.id, remoteRule);
                    }
                }
            }
        }
        return {
            merged: Array.from(mergedMap.values()),
            conflicts,
        };
    }
    /**
     * 충돌 해결
     */
    resolveConflicts(conflicts, resolution) {
        return conflicts.map(conflict => ({
            ...conflict,
            resolution: resolution === 'manual' ? undefined : resolution,
        }));
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    /**
     * 플랫폼별 콘텐츠 파싱
     */
    parsePlatformContent(platformName, content) {
        switch (platformName) {
            case 'cursor':
                return this.parseCursorContent(content);
            case 'claude':
                return this.parseClaudeContent(content);
            default:
                return [];
        }
    }
    /**
     * Cursor .cursorrules 파싱
     */
    parseCursorContent(content) {
        const rules = [];
        const lines = content.split('\n');
        let currentRule = null;
        let inCodeBlock = false;
        let codeBlockContent = [];
        let currentSection = 'none';
        for (const line of lines) {
            // 코드 블록 처리
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    // 코드 블록 종료
                    if (currentRule) {
                        if (!currentRule.examples) {
                            currentRule.examples = { good: [], bad: [] };
                        }
                        if (currentSection === 'do') {
                            currentRule.examples.good.push(codeBlockContent.join('\n'));
                        }
                        else if (currentSection === 'dont') {
                            currentRule.examples.bad.push(codeBlockContent.join('\n'));
                        }
                    }
                    codeBlockContent = [];
                    inCodeBlock = false;
                }
                else {
                    inCodeBlock = true;
                }
                continue;
            }
            if (inCodeBlock) {
                codeBlockContent.push(line);
                continue;
            }
            // 규칙 헤더 (### 🔴 규칙명 또는 ### 규칙명)
            const ruleMatch = line.match(/^###\s+(?:🔴|🟡|🔵)?\s*(.+)$/);
            if (ruleMatch) {
                // 이전 규칙 저장
                if (currentRule && currentRule.name) {
                    rules.push(this.completePartialRule(currentRule));
                }
                // 새 규칙 시작
                currentRule = {
                    name: ruleMatch[1].trim(),
                    severity: line.includes('🔴') ? 'error' :
                        line.includes('🟡') ? 'warning' : 'info',
                };
                currentSection = 'none';
                continue;
            }
            // Do/Don't 섹션
            if (line.includes('**Do:**') || line.includes('**Do**')) {
                currentSection = 'do';
                continue;
            }
            if (line.includes("**Don't:**") || line.includes("**Don't**")) {
                currentSection = 'dont';
                continue;
            }
            // 설명 추출 (현재 규칙의 첫 번째 일반 텍스트)
            if (currentRule && !currentRule.description && line.trim() && !line.startsWith('#') && !line.startsWith('**')) {
                currentRule.description = line.trim();
            }
        }
        // 마지막 규칙 저장
        if (currentRule && currentRule.name) {
            rules.push(this.completePartialRule(currentRule));
        }
        return rules;
    }
    /**
     * Claude .claude/rules/ 파싱
     */
    parseClaudeContent(content) {
        const rules = [];
        const sections = content.split(/^---$/m).filter(s => s.trim());
        for (const section of sections) {
            const rule = this.parseClaudeSection(section);
            if (rule) {
                rules.push(rule);
            }
        }
        return rules;
    }
    /**
     * Claude 섹션 파싱
     */
    parseClaudeSection(section) {
        const lines = section.split('\n');
        let currentRule = {};
        let inFrontmatter = false;
        let frontmatter = {};
        for (const line of lines) {
            // frontmatter 처리
            if (line.trim() === '---') {
                inFrontmatter = !inFrontmatter;
                continue;
            }
            if (inFrontmatter) {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    frontmatter[key.trim()] = valueParts.join(':').trim();
                }
                continue;
            }
            // 규칙 이름 (## 제목)
            const titleMatch = line.match(/^##\s+(.+)$/);
            if (titleMatch) {
                currentRule.name = titleMatch[1].trim();
                continue;
            }
            // ID와 심각도 파싱
            const idMatch = line.match(/\*\*ID:\*\*\s*`([^`]+)`/);
            if (idMatch) {
                currentRule.id = idMatch[1];
            }
            const severityMatch = line.match(/\*\*Severity:\*\*\s*(?:🔴|🟡|🔵)?\s*(\w+)/);
            if (severityMatch) {
                currentRule.severity = severityMatch[1];
            }
            // 설명 추출
            if (!currentRule.description && line.trim() && !line.startsWith('#') && !line.startsWith('**') && !line.startsWith('```')) {
                currentRule.description = line.trim();
            }
        }
        if (currentRule.name) {
            return this.completePartialRule(currentRule);
        }
        return null;
    }
    /**
     * 부분 규칙을 완전한 규칙으로 변환
     */
    completePartialRule(partial) {
        const now = new Date().toISOString();
        return {
            id: partial.id || this.generateIdFromName(partial.name || 'rule'),
            name: partial.name || 'Unknown Rule',
            description: partial.description || '',
            category: partial.category || 'imported',
            tags: partial.tags || ['imported'],
            severity: partial.severity || 'info',
            examples: partial.examples,
            exceptions: partial.exceptions,
            related: partial.related,
            created: partial.created || now,
            updated: partial.updated || now,
            scope: 'package',
            enabled: true,
            source: 'platform-import',
        };
    }
    /**
     * 이름에서 ID 생성
     */
    generateIdFromName(name) {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9가-힣\s]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 20);
        const suffix = Math.random().toString(36).slice(2, 5);
        return `${slug}-${suffix}`;
    }
    /**
     * Pull 결과 적용
     */
    async applyPull(localRules, remoteRules) {
        const localIds = new Set(localRules.map(r => r.id));
        const newRules = [];
        const updatedRules = [];
        for (const remoteRule of remoteRules) {
            if (!localIds.has(remoteRule.id)) {
                // 새 규칙
                await this.manager.saveRule(remoteRule);
                newRules.push(remoteRule.id);
            }
            else {
                // 기존 규칙 업데이트 (선택적)
                // 여기서는 로컬 우선으로 업데이트하지 않음
                // 충돌 해결 로직에서 처리
            }
        }
        return {
            count: remoteRules.length,
            rules: remoteRules.map(r => r.id),
            newRules,
            updatedRules,
        };
    }
    /**
     * 동기화 충돌 감지
     */
    detectSyncConflicts(localRules, remoteRules) {
        const conflicts = [];
        const localMap = new Map(localRules.map(r => [r.id, r]));
        for (const remoteRule of remoteRules) {
            const localRule = localMap.get(remoteRule.id);
            if (!localRule)
                continue;
            const differences = this.compareRules(localRule, remoteRule);
            for (const diff of differences) {
                conflicts.push({
                    ruleId: remoteRule.id,
                    localVersion: localRule.metadata?.version || '0.0.0',
                    remoteVersion: remoteRule.metadata?.version || '0.0.0',
                    field: diff.field,
                    localValue: diff.oldValue,
                    remoteValue: diff.newValue,
                });
            }
        }
        return conflicts;
    }
    /**
     * 두 규칙 비교
     */
    compareRules(a, b) {
        const changes = [];
        const compareFields = [
            'name', 'description', 'category', 'severity', 'enabled'
        ];
        for (const field of compareFields) {
            if (JSON.stringify(a[field]) !== JSON.stringify(b[field])) {
                changes.push({
                    field,
                    oldValue: a[field],
                    newValue: b[field],
                    type: 'modified',
                });
            }
        }
        // 태그 비교
        const aTags = new Set(a.tags);
        const bTags = new Set(b.tags);
        if (![...aTags].every(t => bTags.has(t)) || ![...bTags].every(t => aTags.has(t))) {
            changes.push({
                field: 'tags',
                oldValue: a.tags,
                newValue: b.tags,
                type: 'modified',
            });
        }
        return changes;
    }
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Diff 결과 포맷
 */
export function formatSyncDiff(diff) {
    const lines = [];
    lines.push(`플랫폼: ${diff.platform}`);
    lines.push('');
    if (diff.localOnly.length > 0) {
        lines.push(`📤 로컬에만 있는 규칙 (${diff.localOnly.length}개):`);
        for (const id of diff.localOnly) {
            lines.push(`  + ${id}`);
        }
        lines.push('');
    }
    if (diff.remoteOnly.length > 0) {
        lines.push(`📥 플랫폼에만 있는 규칙 (${diff.remoteOnly.length}개):`);
        for (const id of diff.remoteOnly) {
            lines.push(`  - ${id}`);
        }
        lines.push('');
    }
    if (diff.different.length > 0) {
        lines.push(`🔄 내용이 다른 규칙 (${diff.different.length}개):`);
        for (const item of diff.different) {
            lines.push(`  ~ ${item.ruleId}`);
            for (const change of item.differences) {
                lines.push(`    ${change.field}: 변경됨`);
            }
        }
        lines.push('');
    }
    if (diff.identical.length > 0) {
        lines.push(`✅ 동일한 규칙 (${diff.identical.length}개)`);
    }
    return lines.join('\n');
}
/**
 * 충돌 포맷
 */
export function formatConflicts(conflicts) {
    if (conflicts.length === 0) {
        return '충돌 없음';
    }
    const lines = [];
    lines.push(`⚠️ 충돌 발견 (${conflicts.length}개)`);
    lines.push('');
    const byRule = new Map();
    for (const conflict of conflicts) {
        if (!byRule.has(conflict.ruleId)) {
            byRule.set(conflict.ruleId, []);
        }
        byRule.get(conflict.ruleId).push(conflict);
    }
    for (const [ruleId, ruleConflicts] of byRule) {
        lines.push(`${ruleId}:`);
        for (const conflict of ruleConflicts) {
            lines.push(`  ${conflict.field}:`);
            lines.push(`    로컬: ${JSON.stringify(conflict.localValue)}`);
            lines.push(`    원격: ${JSON.stringify(conflict.remoteValue)}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
export default SyncManager;
//# sourceMappingURL=sync-manager.js.map