/**
 * Monol Rulebook - Platform Adapter Base
 *
 * 플랫폼 어댑터 공통 인터페이스 및 유틸리티
 */
import * as fs from 'fs/promises';
import * as path from 'path';
// ============================================================================
// Abstract Base Adapter
// ============================================================================
export class BasePlatformAdapter {
    basePath;
    constructor(basePath) {
        this.basePath = basePath;
    }
    async sync(rules) {
        try {
            const content = this.format(rules);
            await this.write(content);
            return {
                success: true,
                platform: this.name,
                rulesCount: rules.length,
                outputPath: this.getOutputPath(),
            };
        }
        catch (e) {
            return {
                success: false,
                platform: this.name,
                rulesCount: 0,
                outputPath: this.getOutputPath(),
                error: String(e),
            };
        }
    }
    async ensureDir(filePath) {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
    }
}
// ============================================================================
// Format Utilities
// ============================================================================
/**
 * 심각도 아이콘
 */
export function getSeverityIcon(severity) {
    switch (severity) {
        case 'error': return '🔴';
        case 'warning': return '🟡';
        case 'info': return '🔵';
        default: return '⚪';
    }
}
/**
 * 규칙을 마크다운으로 변환
 */
export function ruleToMarkdown(rule, includeExamples = true) {
    const lines = [];
    lines.push(`## ${rule.name}`);
    lines.push('');
    lines.push(`**ID:** \`${rule.id}\``);
    lines.push(`**심각도:** ${getSeverityIcon(rule.severity)} ${rule.severity}`);
    lines.push(`**태그:** ${rule.tags.map(t => `\`${t}\``).join(', ')}`);
    lines.push('');
    lines.push(rule.description);
    if (includeExamples && rule.examples) {
        lines.push('');
        if (rule.examples.good && rule.examples.good.length > 0) {
            lines.push('### Good');
            lines.push('```');
            lines.push(rule.examples.good.join('\n'));
            lines.push('```');
        }
        if (rule.examples.bad && rule.examples.bad.length > 0) {
            lines.push('### Bad');
            lines.push('```');
            lines.push(rule.examples.bad.join('\n'));
            lines.push('```');
        }
    }
    if (rule.exceptions && rule.exceptions.length > 0) {
        lines.push('');
        lines.push('### Exceptions');
        for (const exc of rule.exceptions) {
            lines.push(`- ${exc}`);
        }
    }
    return lines.join('\n');
}
/**
 * 규칙 그룹을 마크다운 문서로 변환
 */
export function rulesToMarkdownDocument(rules, options = {}) {
    const { title = 'Project Rules', includeExamples = true, includeToc = true, } = options;
    const lines = [];
    // 헤더
    lines.push(`# ${title}`);
    lines.push('');
    lines.push(`> Auto-generated from Monol Rulebook | ${new Date().toISOString().split('T')[0]}`);
    lines.push('');
    // 카테고리별 그룹화
    const byCategory = new Map();
    for (const rule of rules) {
        const category = rule.category.split('/')[0];
        if (!byCategory.has(category)) {
            byCategory.set(category, []);
        }
        byCategory.get(category).push(rule);
    }
    // TOC
    if (includeToc && byCategory.size > 1) {
        lines.push('## Table of Contents');
        lines.push('');
        for (const [category, catRules] of byCategory) {
            lines.push(`- [${category}](#${category.toLowerCase()}) (${catRules.length})`);
        }
        lines.push('');
        lines.push('---');
        lines.push('');
    }
    // 각 카테고리
    for (const [category, catRules] of byCategory) {
        lines.push(`# ${category}`);
        lines.push('');
        for (const rule of catRules) {
            lines.push(ruleToMarkdown(rule, includeExamples));
            lines.push('');
            lines.push('---');
            lines.push('');
        }
    }
    return lines.join('\n');
}
/**
 * 규칙을 간단한 지시문으로 변환
 */
export function ruleToDirective(rule) {
    const lines = [];
    lines.push(`- ${rule.name}:`);
    lines.push(`  ${rule.description.split('\n')[0]}`);
    if (rule.examples?.good?.[0]) {
        lines.push(`  Example: ${rule.examples.good[0].trim()}`);
    }
    return lines.join('\n');
}
/**
 * 규칙 목록을 지시문 목록으로 변환
 */
export function rulesToDirectives(rules) {
    const lines = [];
    lines.push('# Coding Guidelines');
    lines.push('');
    lines.push('Follow these rules when writing code:');
    lines.push('');
    for (const rule of rules) {
        lines.push(ruleToDirective(rule));
        lines.push('');
    }
    return lines.join('\n');
}
// ============================================================================
// Adapter Registry
// ============================================================================
const adapterRegistry = new Map();
export function registerAdapter(name, adapter) {
    adapterRegistry.set(name, adapter);
}
export function getAdapter(name, basePath) {
    const AdapterClass = adapterRegistry.get(name);
    if (AdapterClass) {
        return new AdapterClass(basePath);
    }
    return undefined;
}
export function getAvailableAdapters() {
    return Array.from(adapterRegistry.keys());
}
export default BasePlatformAdapter;
//# sourceMappingURL=platform-adapter.js.map