/**
 * Monol Rulebook - Conflict Resolver
 *
 * 규칙 동기화 시 발생하는 충돌 감지 및 해결
 */

import type {
  Rule,
  SharedRule,
  RemoteSyncConflict,
  ConflictResolutionStrategy,
  RuleDiff,
} from './types.js';
import { RulebookError } from './errors.js';

// ============================================================================
// Types
// ============================================================================

export type ConflictType =
  | 'concurrent_modification' // 동시 수정
  | 'deleted_remotely'        // 원격에서 삭제됨
  | 'deleted_locally'         // 로컬에서 삭제됨
  | 'version_mismatch'        // 버전 불일치
  | 'schema_incompatible';    // 스키마 호환 불가

export interface ConflictInfo extends RemoteSyncConflict {
  /** 충돌 유형 */
  type: ConflictType;

  /** 상세 diff */
  diff?: RuleDiff;

  /** 제안된 해결 방법 */
  suggestedResolution?: ConflictResolutionStrategy;

  /** 자동 해결 가능 여부 */
  autoResolvable: boolean;

  /** 자동 해결 시 결과 규칙 */
  autoResolvedRule?: Rule;
}

export interface MergeResult {
  success: boolean;
  mergedRule?: Rule;
  conflicts?: string[]; // 필드 단위 충돌
}

export interface ConflictResolverConfig {
  /** 기본 충돌 해결 전략 */
  defaultStrategy: ConflictResolutionStrategy;

  /** 자동 해결 가능 필드 (이 필드들은 자동 머지) */
  autoMergeFields?: string[];

  /** 우선순위 필드 (충돌 시 이 필드 값으로 결정) */
  priorityFields?: string[];

  /** 3-way 머지 활성화 */
  enableThreeWayMerge?: boolean;
}

// ============================================================================
// Conflict Resolver Class
// ============================================================================

/**
 * 충돌 해결기
 *
 * - 충돌 감지
 * - 자동 머지 (3-way merge)
 * - 수동 해결 지원
 * - Diff 생성
 */
export class ConflictResolver {
  private config: Required<ConflictResolverConfig>;

  constructor(config?: Partial<ConflictResolverConfig>) {
    this.config = {
      defaultStrategy: config?.defaultStrategy || 'manual',
      autoMergeFields: config?.autoMergeFields || ['tags', 'metadata.changelog'],
      priorityFields: config?.priorityFields || [],
      enableThreeWayMerge: config?.enableThreeWayMerge ?? true,
    };
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * 충돌 감지
   */
  detectConflict(
    localRule: Rule,
    remoteRule: SharedRule,
    baseRule?: Rule // 공통 조상 (3-way merge용)
  ): ConflictInfo | null {
    // 동일한 규칙인지 확인
    if (this.areRulesEqual(localRule, remoteRule)) {
      return null;
    }

    // 버전 비교
    const localVersion = localRule.metadata?.version || '1.0.0';
    const remoteVersion = remoteRule.metadata?.version || '1.0.0';

    const conflictType = this.determineConflictType(localRule, remoteRule, baseRule);
    const diff = this.generateDiff(localRule, remoteRule, baseRule);
    const autoResolvable = this.isAutoResolvable(diff);

    const conflict: ConflictInfo = {
      ruleId: localRule.id,
      type: conflictType,
      localRule,
      remoteRule,
      diff,
      autoResolvable,
      suggestedResolution: this.suggestResolution(conflictType, diff),
    };

    // 자동 해결 가능하면 머지 결과도 계산
    if (autoResolvable && this.config.enableThreeWayMerge) {
      const mergeResult = this.attemptAutoMerge(localRule, remoteRule, baseRule);
      if (mergeResult.success && mergeResult.mergedRule) {
        conflict.autoResolvedRule = mergeResult.mergedRule;
      }
    }

    return conflict;
  }

  /**
   * 배치 충돌 감지
   */
  detectConflicts(
    localRules: Rule[],
    remoteRules: SharedRule[],
    baseRules?: Map<string, Rule>
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const remoteMap = new Map(remoteRules.map(r => [r.id, r]));

    for (const local of localRules) {
      const remote = remoteMap.get(local.id);
      if (remote) {
        const base = baseRules?.get(local.id);
        const conflict = this.detectConflict(local, remote, base);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    // 로컬에서 삭제된 규칙 감지
    for (const remote of remoteRules) {
      const hasLocal = localRules.some(l => l.id === remote.id);
      if (!hasLocal && baseRules?.has(remote.id)) {
        conflicts.push({
          ruleId: remote.id,
          type: 'deleted_locally',
          remoteRule: remote,
          autoResolvable: true,
          suggestedResolution: 'remote-wins',
        });
      }
    }

    return conflicts;
  }

  /**
   * 충돌 해결
   */
  resolveConflict(
    conflict: ConflictInfo,
    strategy?: ConflictResolutionStrategy
  ): Rule | null {
    const resolveStrategy = strategy || this.config.defaultStrategy;

    switch (resolveStrategy) {
      case 'local-wins':
        return conflict.localRule || null;

      case 'remote-wins':
        return conflict.remoteRule ? this.sharedRuleToRule(conflict.remoteRule) : null;

      case 'auto':
        if (conflict.autoResolvedRule) {
          return conflict.autoResolvedRule;
        }
        // 자동 해결 불가 시 remote-wins로 fallback
        return conflict.remoteRule ? this.sharedRuleToRule(conflict.remoteRule) : null;

      case 'manual':
      default:
        return null;
    }
  }

  /**
   * 배치 충돌 해결
   */
  resolveConflicts(
    conflicts: ConflictInfo[],
    strategy?: ConflictResolutionStrategy
  ): Map<string, Rule | null> {
    const results = new Map<string, Rule | null>();

    for (const conflict of conflicts) {
      const resolved = this.resolveConflict(conflict, strategy);
      results.set(conflict.ruleId, resolved);
    }

    return results;
  }

  /**
   * 3-way 머지 시도
   */
  attemptAutoMerge(
    localRule: Rule,
    remoteRule: SharedRule,
    baseRule?: Rule
  ): MergeResult {
    if (!this.config.enableThreeWayMerge) {
      return { success: false, conflicts: ['3-way merge disabled'] };
    }

    const conflicts: string[] = [];
    const merged: Rule = { ...localRule };

    // 필드별 머지
    const allFields = new Set([
      ...Object.keys(localRule),
      ...Object.keys(remoteRule),
      ...(baseRule ? Object.keys(baseRule) : []),
    ]);

    for (const field of allFields) {
      if (field === 'id') continue; // ID는 변경 불가

      const localValue = (localRule as Record<string, unknown>)[field];
      const remoteValue = (remoteRule as Record<string, unknown>)[field];
      const baseValue = baseRule ? (baseRule as Record<string, unknown>)[field] : undefined;

      const mergeResult = this.mergeField(field, localValue, remoteValue, baseValue);

      if (mergeResult.conflict) {
        conflicts.push(field);
      } else {
        (merged as Record<string, unknown>)[field] = mergeResult.value;
      }
    }

    // 충돌이 있지만 자동 머지 가능 필드만이면 성공
    const unresolvedConflicts = conflicts.filter(
      f => !this.config.autoMergeFields.includes(f)
    );

    if (unresolvedConflicts.length > 0) {
      return { success: false, conflicts: unresolvedConflicts };
    }

    // 버전 업데이트
    if (merged.metadata) {
      merged.metadata = {
        ...merged.metadata,
        version: this.incrementVersion(merged.metadata.version || '1.0.0'),
      };
    }

    return { success: true, mergedRule: merged };
  }

  /**
   * Diff 생성
   */
  generateDiff(
    localRule: Rule,
    remoteRule: SharedRule,
    baseRule?: Rule
  ): RuleDiff {
    const added: string[] = [];
    const removed: string[] = [];
    const modified: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

    const allFields = new Set([
      ...Object.keys(localRule),
      ...Object.keys(remoteRule),
    ]);

    for (const field of allFields) {
      const localValue = (localRule as Record<string, unknown>)[field];
      const remoteValue = (remoteRule as Record<string, unknown>)[field];

      if (localValue === undefined && remoteValue !== undefined) {
        added.push(field);
      } else if (localValue !== undefined && remoteValue === undefined) {
        removed.push(field);
      } else if (!this.deepEqual(localValue, remoteValue)) {
        modified.push({ field, oldValue: localValue, newValue: remoteValue });
      }
    }

    return {
      ruleId: localRule.id,
      oldVersion: localRule.metadata?.version || '1.0.0',
      newVersion: remoteRule.metadata?.version || '1.0.0',
      changes: {
        added,
        removed,
        modified,
      },
    };
  }

  /**
   * 충돌 정보 포맷팅
   */
  formatConflict(conflict: ConflictInfo): string {
    const lines: string[] = [];

    lines.push(`규칙 ID: ${conflict.ruleId}`);
    lines.push(`충돌 유형: ${this.getConflictTypeLabel(conflict.type)}`);
    lines.push(`자동 해결: ${conflict.autoResolvable ? '가능' : '불가'}`);

    if (conflict.suggestedResolution) {
      lines.push(`권장 해결: ${this.getStrategyLabel(conflict.suggestedResolution)}`);
    }

    if (conflict.diff) {
      lines.push('\n변경 사항:');
      if (conflict.diff.changes.added.length > 0) {
        lines.push(`  추가: ${conflict.diff.changes.added.join(', ')}`);
      }
      if (conflict.diff.changes.removed.length > 0) {
        lines.push(`  삭제: ${conflict.diff.changes.removed.join(', ')}`);
      }
      if (conflict.diff.changes.modified.length > 0) {
        lines.push('  수정:');
        for (const mod of conflict.diff.changes.modified) {
          lines.push(`    - ${mod.field}: ${JSON.stringify(mod.oldValue)} → ${JSON.stringify(mod.newValue)}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * 여러 충돌 포맷팅
   */
  formatConflicts(conflicts: ConflictInfo[]): string {
    if (conflicts.length === 0) {
      return '충돌 없음';
    }

    const lines: string[] = [];
    lines.push(`총 ${conflicts.length}개의 충돌 발견:\n`);

    for (let i = 0; i < conflicts.length; i++) {
      lines.push(`[${i + 1}] ${this.formatConflict(conflicts[i])}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private determineConflictType(
    localRule: Rule,
    remoteRule: SharedRule,
    baseRule?: Rule
  ): ConflictType {
    const localVersion = localRule.metadata?.version || '1.0.0';
    const remoteVersion = remoteRule.metadata?.version || '1.0.0';
    const baseVersion = baseRule?.metadata?.version || '1.0.0';

    // 버전이 같은데 내용이 다르면 동시 수정
    if (localVersion === remoteVersion) {
      return 'concurrent_modification';
    }

    // 로컬이 베이스보다 낮으면 버전 불일치
    if (baseRule && this.compareVersions(localVersion, baseVersion) < 0) {
      return 'version_mismatch';
    }

    return 'concurrent_modification';
  }

  private isAutoResolvable(diff: RuleDiff): boolean {
    // 모든 변경이 자동 머지 가능 필드에만 있으면 자동 해결 가능
    const changedFields = [
      ...diff.changes.added,
      ...diff.changes.removed,
      ...diff.changes.modified.map(m => m.field),
    ];

    return changedFields.every(f => this.config.autoMergeFields.includes(f));
  }

  private suggestResolution(
    type: ConflictType,
    diff: RuleDiff
  ): ConflictResolutionStrategy {
    switch (type) {
      case 'deleted_remotely':
        return 'remote-wins';

      case 'deleted_locally':
        return 'remote-wins';

      case 'version_mismatch':
        return 'remote-wins';

      case 'concurrent_modification':
        // 변경이 적은 쪽을 덮어쓰기 권장
        if (this.config.enableThreeWayMerge) {
          return 'auto';
        }
        return 'manual';

      default:
        return 'manual';
    }
  }

  private mergeField(
    field: string,
    localValue: unknown,
    remoteValue: unknown,
    baseValue: unknown
  ): { value: unknown; conflict: boolean } {
    // 둘 다 없으면 base 값 유지
    if (localValue === undefined && remoteValue === undefined) {
      return { value: baseValue, conflict: false };
    }

    // 하나만 변경됐으면 변경된 값 사용
    if (this.deepEqual(localValue, baseValue) && !this.deepEqual(remoteValue, baseValue)) {
      return { value: remoteValue, conflict: false };
    }
    if (!this.deepEqual(localValue, baseValue) && this.deepEqual(remoteValue, baseValue)) {
      return { value: localValue, conflict: false };
    }

    // 둘 다 같은 값으로 변경됐으면 충돌 아님
    if (this.deepEqual(localValue, remoteValue)) {
      return { value: localValue, conflict: false };
    }

    // 배열이면 합집합 시도
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      const merged = this.mergeArrays(
        localValue,
        remoteValue,
        Array.isArray(baseValue) ? baseValue : []
      );
      return { value: merged, conflict: false };
    }

    // 자동 머지 가능 필드면 remote 우선
    if (this.config.autoMergeFields.includes(field)) {
      return { value: remoteValue, conflict: false };
    }

    // 우선순위 필드면 local 우선
    if (this.config.priorityFields.includes(field)) {
      return { value: localValue, conflict: false };
    }

    // 그 외는 충돌
    return { value: localValue, conflict: true };
  }

  private mergeArrays<T>(local: T[], remote: T[], base: T[]): T[] {
    // 3-way array merge: base에서 추가된 것 + base에서 삭제되지 않은 것
    const localAdded = local.filter(
      item => !base.some(b => this.deepEqual(b, item))
    );
    const remoteAdded = remote.filter(
      item => !base.some(b => this.deepEqual(b, item))
    );
    const localRemoved = base.filter(
      item => !local.some(l => this.deepEqual(l, item))
    );
    const remoteRemoved = base.filter(
      item => !remote.some(r => this.deepEqual(r, item))
    );

    // base에서 시작해서 삭제된 것 제외, 추가된 것 포함
    const allRemoved = [...localRemoved, ...remoteRemoved];
    const kept = base.filter(
      item => !allRemoved.some(r => this.deepEqual(r, item))
    );

    // 중복 제거하면서 합치기
    const merged = [...kept];
    for (const item of [...localAdded, ...remoteAdded]) {
      if (!merged.some(m => this.deepEqual(m, item))) {
        merged.push(item);
      }
    }

    return merged;
  }

  private areRulesEqual(a: Rule, b: Rule | SharedRule): boolean {
    // 핵심 필드만 비교
    const fields = ['name', 'description', 'category', 'severity', 'content'];

    for (const field of fields) {
      const aVal = (a as Record<string, unknown>)[field];
      const bVal = (b as Record<string, unknown>)[field];
      if (!this.deepEqual(aVal, bVal)) {
        return false;
      }
    }

    return true;
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, i) => this.deepEqual(item, b[i]));
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a as object);
      const keysB = Object.keys(b as object);

      if (keysA.length !== keysB.length) return false;

      return keysA.every(key =>
        this.deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      );
    }

    return false;
  }

  private compareVersions(a: string, b: string): number {
    const parseVersion = (v: string) => {
      const parts = v.replace(/^v/, '').split('.').map(Number);
      return parts;
    };

    const partsA = parseVersion(a);
    const partsB = parseVersion(b);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;

      if (numA < numB) return -1;
      if (numA > numB) return 1;
    }

    return 0;
  }

  private incrementVersion(version: string): string {
    const parts = version.replace(/^v/, '').split('.').map(Number);

    // 패치 버전 증가
    if (parts.length >= 3) {
      parts[2]++;
    } else if (parts.length === 2) {
      parts.push(1);
    } else if (parts.length === 1) {
      parts.push(0, 1);
    }

    return parts.join('.');
  }

  private sharedRuleToRule(shared: SharedRule): Rule {
    // SharedRule에서 Rule로 변환 (협업 필드 제외)
    const {
      teamId,
      visibility,
      collaboration,
      origin,
      publishedAt,
      listedInMarketplace,
      ...rule
    } = shared;

    return rule as Rule;
  }

  private getConflictTypeLabel(type: ConflictType): string {
    const labels: Record<ConflictType, string> = {
      concurrent_modification: '동시 수정',
      deleted_remotely: '원격에서 삭제됨',
      deleted_locally: '로컬에서 삭제됨',
      version_mismatch: '버전 불일치',
      schema_incompatible: '스키마 호환 불가',
    };
    return labels[type] || type;
  }

  private getStrategyLabel(strategy: ConflictResolutionStrategy): string {
    const labels: Record<ConflictResolutionStrategy, string> = {
      'local-wins': '로컬 우선',
      'remote-wins': '원격 우선',
      'auto': '자동 머지',
      'manual': '수동 해결',
    };
    return labels[strategy] || strategy;
  }
}

// ============================================================================
// Singleton Helper
// ============================================================================

let defaultResolver: ConflictResolver | null = null;

/**
 * 기본 ConflictResolver 인스턴스 반환
 */
export function getConflictResolver(config?: Partial<ConflictResolverConfig>): ConflictResolver {
  if (!defaultResolver) {
    defaultResolver = new ConflictResolver(config);
  }
  return defaultResolver;
}

export default ConflictResolver;
