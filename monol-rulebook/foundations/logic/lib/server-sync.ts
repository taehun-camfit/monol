/**
 * Monol Rulebook - Server Sync Module
 *
 * monol-server와의 동기화를 담당
 * - ServerSync: 이벤트 기반 동기화 (기존)
 * - RemoteSyncService: 규칙 데이터 동기화 (확장)
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type {
  Rule,
  RuleEvent,
  SharedRule,
  Team,
  RemoteSyncConfig,
  SyncState,
  RemoteSyncResult,
  RemoteSyncConflict,
  OfflineQueueItem,
  ConflictResolutionStrategy,
  RemoteSyncDirection,
} from './types.js';
import { AuthManager, AuthError } from './auth-manager.js';
import { RulebookError } from './errors.js';

// ============================================================================
// Types
// ============================================================================

export interface ServerSyncConfig {
  /** 동기화 활성화 */
  enabled: boolean;

  /** monol-server URL */
  serverUrl: string;

  /** 팀 ID (선택사항) */
  team?: string;

  /** 타임아웃 (ms) */
  timeout: number;

  /** 사용자명 */
  user?: string;
}

export interface ServerEventPayload {
  user: string;
  team?: string;
  plugin: string;
  type: string;
  data: Record<string, unknown>;
}

export interface ServerResponse {
  success: boolean;
  id?: string;
  error?: string;
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: ServerSyncConfig = {
  enabled: true,
  serverUrl: 'http://localhost:3030',
  timeout: 5000,
};

// ============================================================================
// ServerSync Class
// ============================================================================

export class ServerSync {
  private config: ServerSyncConfig;

  constructor(config?: Partial<ServerSyncConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      user: config?.user || this.detectUser(),
    };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * 서버 연결 확인
   */
  async checkConnection(): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.config.serverUrl}/api/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 규칙 추가 이벤트 전송
   */
  async syncRuleAdded(rule: Rule): Promise<boolean> {
    return this.sendEvent('rule_added', {
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      tags: rule.tags,
      author: rule.metadata?.author || this.config.user,
      version: rule.metadata?.version || '1.0.0',
    });
  }

  /**
   * 규칙 수정 이벤트 전송
   */
  async syncRuleUpdated(rule: Rule, changes?: string): Promise<boolean> {
    return this.sendEvent('rule_updated', {
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      tags: rule.tags,
      author: rule.metadata?.author || this.config.user,
      version: rule.metadata?.version || '1.0.0',
      changes,
    });
  }

  /**
   * 규칙 삭제 이벤트 전송
   */
  async syncRuleDeleted(ruleId: string): Promise<boolean> {
    return this.sendEvent('rule_deleted', {
      ruleId,
    });
  }

  /**
   * 플랫폼 동기화 이벤트 전송
   */
  async syncPlatformSync(
    platform: string,
    rulesCount: number,
    direction: 'push' | 'pull' | 'both'
  ): Promise<boolean> {
    return this.sendEvent('rule_synced', {
      platform,
      rulesCount,
      direction,
    });
  }

  /**
   * 일반 이벤트 전송
   */
  async sendEvent(
    type: string,
    data: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const payload: ServerEventPayload = {
      user: this.config.user || 'unknown',
      team: this.config.team,
      plugin: 'monol-rulebook',
      type,
      data,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(`${this.config.serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const result = (await response.json()) as ServerResponse;
      return result.success;
    } catch {
      // 서버 연결 실패는 조용히 무시 (동기화는 best-effort)
      return false;
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<ServerSyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): ServerSyncConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  /**
   * 사용자 감지
   */
  private detectUser(): string {
    // 환경변수에서 사용자 감지
    if (process.env.MONOL_USER) {
      return process.env.MONOL_USER;
    }

    // git config에서 가져오기 시도
    try {
      const { execSync } = require('child_process');
      const gitUser = execSync('git config user.name', {
        encoding: 'utf-8',
        timeout: 1000,
      }).trim();
      if (gitUser) return gitUser;
    } catch {
      // git 없으면 무시
    }

    // 시스템 사용자명
    return process.env.USER || process.env.USERNAME || 'unknown';
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serverSyncInstance: ServerSync | null = null;

/**
 * ServerSync 싱글톤 인스턴스 반환
 */
export function getServerSync(config?: Partial<ServerSyncConfig>): ServerSync {
  if (!serverSyncInstance) {
    serverSyncInstance = new ServerSync(config);
  } else if (config) {
    serverSyncInstance.updateConfig(config);
  }
  return serverSyncInstance;
}

/**
 * 환경변수에서 설정 로드
 */
export function loadConfigFromEnv(): Partial<ServerSyncConfig> {
  return {
    enabled: process.env.MONOL_SYNC_ENABLED !== 'false',
    serverUrl: process.env.MONOL_SERVER_URL || DEFAULT_CONFIG.serverUrl,
    team: process.env.MONOL_TEAM,
    user: process.env.MONOL_USER,
    timeout: process.env.MONOL_SYNC_TIMEOUT
      ? parseInt(process.env.MONOL_SYNC_TIMEOUT, 10)
      : DEFAULT_CONFIG.timeout,
  };
}

export default ServerSync;

// ============================================================================
// Remote Sync Error
// ============================================================================

/**
 * 원격 동기화 에러
 */
export class RemoteSyncError extends RulebookError {
  readonly statusCode?: number;
  readonly conflicts?: RemoteSyncConflict[];

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      conflicts?: RemoteSyncConflict[];
    } = {}
  ) {
    super(options.code || 'REMOTE_SYNC_ERROR', message, {
      suggestion: '네트워크 연결을 확인하고 다시 시도하세요.',
    });

    this.name = 'RemoteSyncError';
    this.statusCode = options.statusCode;
    this.conflicts = options.conflicts;
  }

  static networkError(reason?: string): RemoteSyncError {
    return new RemoteSyncError(`네트워크 오류${reason ? `: ${reason}` : ''}`, {
      code: 'NETWORK_ERROR',
    });
  }

  static serverError(statusCode: number, message?: string): RemoteSyncError {
    return new RemoteSyncError(`서버 오류 (${statusCode})${message ? `: ${message}` : ''}`, {
      code: 'SERVER_ERROR',
      statusCode,
    });
  }

  static conflictError(conflicts: RemoteSyncConflict[]): RemoteSyncError {
    return new RemoteSyncError(`${conflicts.length}개의 충돌이 발견되었습니다`, {
      code: 'CONFLICT_ERROR',
      conflicts,
    });
  }

  static unauthorized(): RemoteSyncError {
    return new RemoteSyncError('인증이 필요합니다', {
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }

  static offline(): RemoteSyncError {
    return new RemoteSyncError('오프라인 상태입니다', {
      code: 'OFFLINE',
    });
  }
}

// ============================================================================
// Remote Sync Service Types
// ============================================================================

export interface RemoteSyncServiceConfig extends RemoteSyncConfig {
  /** 인증 관리자 */
  authManager: AuthManager;

  /** 오프라인 큐 저장 경로 */
  queuePath?: string;

  /** 재시도 횟수 (기본: 3) */
  retryCount?: number;

  /** 재시도 대기 시간 (ms, 기본: 1000) */
  retryDelay?: number;

  /** 배치 크기 (기본: 50) */
  batchSize?: number;
}

export interface SyncProgress {
  total: number;
  current: number;
  phase: 'preparing' | 'pushing' | 'pulling' | 'resolving' | 'completing';
  currentItem?: string;
}

export type SyncProgressListener = (progress: SyncProgress) => void;
export type SyncEventListener = (event: SyncEvent) => void;

export interface SyncEvent {
  type: 'start' | 'complete' | 'error' | 'conflict' | 'offline_queued';
  direction?: RemoteSyncDirection;
  result?: RemoteSyncResult;
  error?: RemoteSyncError;
  queueItem?: OfflineQueueItem;
  timestamp: string;
}

// ============================================================================
// Remote Sync Service
// ============================================================================

/**
 * 원격 동기화 서비스
 *
 * - 규칙 푸시/풀
 * - 충돌 감지 및 해결
 * - 오프라인 큐 관리
 * - 델타 동기화
 */
export class RemoteSyncService {
  private config: Required<Omit<RemoteSyncServiceConfig, 'authManager'>> & { authManager: AuthManager };
  private state: SyncState;
  private offlineQueue: OfflineQueueItem[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private progressListeners: Set<SyncProgressListener> = new Set();
  private eventListeners: Set<SyncEventListener> = new Set();

  constructor(config: RemoteSyncServiceConfig) {
    const defaultQueuePath = path.join(os.homedir(), '.config', 'monol', 'offline-queue.json');

    this.config = {
      serverUrl: config.serverUrl,
      teamId: config.teamId,
      timeout: config.timeout || 30000,
      autoSync: config.autoSync ?? true,
      syncInterval: config.syncInterval || 5 * 60 * 1000, // 5분
      offlineQueue: config.offlineQueue ?? true,
      authManager: config.authManager,
      queuePath: config.queuePath || defaultQueuePath,
      retryCount: config.retryCount || 3,
      retryDelay: config.retryDelay || 1000,
      batchSize: config.batchSize || 50,
    };

    this.state = {
      lastSyncAt: undefined,
      isSyncing: false,
      isOffline: false,
      pendingChanges: 0,
    };
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * 초기화
   */
  async initialize(): Promise<void> {
    // 오프라인 큐 로드
    await this.loadOfflineQueue();

    // 자동 동기화 시작
    if (this.config.autoSync && this.config.syncInterval) {
      this.startAutoSync();
    }

    // 연결 상태 확인
    await this.checkConnection();
  }

  /**
   * 현재 동기화 상태
   */
  getState(): SyncState {
    return {
      ...this.state,
      pendingChanges: this.offlineQueue.length,
    };
  }

  /**
   * 연결 상태 확인
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.fetch('/api/health', { method: 'GET' });
      const wasOffline = this.state.isOffline;
      this.state.isOffline = !response.ok;

      // 오프라인 → 온라인 전환 시 큐 처리
      if (wasOffline && !this.state.isOffline && this.offlineQueue.length > 0) {
        this.processOfflineQueue();
      }

      return response.ok;
    } catch {
      this.state.isOffline = true;
      return false;
    }
  }

  /**
   * 규칙 푸시 (로컬 → 서버)
   */
  async pushRules(
    rules: Rule[],
    options: {
      force?: boolean;
      conflictStrategy?: ConflictResolutionStrategy;
    } = {}
  ): Promise<RemoteSyncResult> {
    return this.sync('push', rules, options);
  }

  /**
   * 규칙 풀 (서버 → 로컬)
   */
  async pullRules(
    options: {
      force?: boolean;
      conflictStrategy?: ConflictResolutionStrategy;
      since?: string; // ISO date for delta sync
    } = {}
  ): Promise<RemoteSyncResult> {
    return this.sync('pull', [], options);
  }

  /**
   * 양방향 동기화
   */
  async syncBidirectional(
    localRules: Rule[],
    options: {
      force?: boolean;
      conflictStrategy?: ConflictResolutionStrategy;
    } = {}
  ): Promise<RemoteSyncResult> {
    return this.sync('both', localRules, options);
  }

  /**
   * 단일 규칙 푸시
   */
  async pushRule(rule: Rule): Promise<RemoteSyncResult> {
    if (this.state.isOffline) {
      await this.addToOfflineQueue('push', rule.id, rule);
      return {
        success: true,
        direction: 'push',
        pushed: { count: 0, rules: [] },
        queuedOffline: 1,
      };
    }

    return this.pushRules([rule]);
  }

  /**
   * 단일 규칙 삭제
   */
  async deleteRule(ruleId: string): Promise<RemoteSyncResult> {
    if (this.state.isOffline) {
      await this.addToOfflineQueue('delete', ruleId);
      return {
        success: true,
        direction: 'push',
        pushed: { count: 0, rules: [] },
        queuedOffline: 1,
      };
    }

    const token = await this.config.authManager.getAccessToken();
    if (!token) {
      throw RemoteSyncError.unauthorized();
    }

    try {
      const response = await this.fetch(`/api/teams/${this.config.teamId}/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw RemoteSyncError.serverError(response.status);
      }

      return {
        success: true,
        direction: 'push',
        pushed: { count: 1, rules: [ruleId] },
      };
    } catch (error) {
      if (error instanceof RemoteSyncError) throw error;
      throw RemoteSyncError.networkError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * 서버의 규칙 목록 조회
   */
  async getRemoteRules(params?: {
    category?: string;
    tags?: string[];
    since?: string;
  }): Promise<SharedRule[]> {
    const token = await this.config.authManager.getAccessToken();
    if (!token) {
      throw RemoteSyncError.unauthorized();
    }

    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set('category', params.category);
    if (params?.tags) queryParams.set('tags', params.tags.join(','));
    if (params?.since) queryParams.set('since', params.since);

    const query = queryParams.toString();
    const endpoint = `/api/teams/${this.config.teamId}/rules${query ? '?' + query : ''}`;

    try {
      const response = await this.fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw RemoteSyncError.serverError(response.status);
      }

      const data = await response.json();
      return data.rules || data;
    } catch (error) {
      if (error instanceof RemoteSyncError) throw error;

      // 오프라인 처리
      this.state.isOffline = true;
      throw RemoteSyncError.offline();
    }
  }

  /**
   * 팀 정보 조회
   */
  async getTeam(): Promise<Team | null> {
    if (!this.config.teamId) return null;

    const token = await this.config.authManager.getAccessToken();
    if (!token) return null;

    try {
      const response = await this.fetch(`/api/teams/${this.config.teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return null;

      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * 팀 목록 조회
   */
  async getTeams(): Promise<Team[]> {
    const token = await this.config.authManager.getAccessToken();
    if (!token) return [];

    try {
      const response = await this.fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.teams || data;
    } catch {
      return [];
    }
  }

  /**
   * 팀 설정
   */
  setTeam(teamId: string): void {
    this.config.teamId = teamId;
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * 진행 상태 리스너 등록
   */
  onProgress(listener: SyncProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  /**
   * 이벤트 리스너 등록
   */
  onEvent(listener: SyncEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emitProgress(progress: SyncProgress): void {
    for (const listener of this.progressListeners) {
      try {
        listener(progress);
      } catch {
        // ignore
      }
    }
  }

  private emitEvent(event: SyncEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // ignore
      }
    }
  }

  // ==========================================================================
  // Core Sync Logic
  // ==========================================================================

  private async sync(
    direction: RemoteSyncDirection,
    localRules: Rule[],
    options: {
      force?: boolean;
      conflictStrategy?: ConflictResolutionStrategy;
      since?: string;
    } = {}
  ): Promise<RemoteSyncResult> {
    if (this.state.isSyncing) {
      throw new RemoteSyncError('동기화가 이미 진행 중입니다');
    }

    const token = await this.config.authManager.getAccessToken();
    if (!token) {
      throw RemoteSyncError.unauthorized();
    }

    if (!this.config.teamId) {
      throw new RemoteSyncError('팀이 설정되지 않았습니다');
    }

    // 오프라인 체크
    if (this.state.isOffline) {
      if (direction === 'push' && this.config.offlineQueue) {
        // 푸시 요청은 큐에 저장
        for (const rule of localRules) {
          await this.addToOfflineQueue('push', rule.id, rule);
        }
        return {
          success: true,
          direction,
          pushed: { count: 0, rules: [] },
          queuedOffline: localRules.length,
        };
      }
      throw RemoteSyncError.offline();
    }

    this.state.isSyncing = true;
    this.emitEvent({ type: 'start', direction, timestamp: new Date().toISOString() });

    try {
      const result: RemoteSyncResult = {
        success: true,
        direction,
        pushed: { count: 0, rules: [] },
        pulled: { count: 0, rules: [] },
        conflicts: [],
      };

      // 1. 푸시 (로컬 → 서버)
      if (direction === 'push' || direction === 'both') {
        this.emitProgress({ total: localRules.length, current: 0, phase: 'pushing' });

        const pushResult = await this.pushToServer(localRules, token, options);
        result.pushed = pushResult.pushed;
        if (pushResult.conflicts) {
          result.conflicts = [...(result.conflicts || []), ...pushResult.conflicts];
        }
      }

      // 2. 풀 (서버 → 로컬)
      if (direction === 'pull' || direction === 'both') {
        this.emitProgress({ total: 1, current: 0, phase: 'pulling' });

        const pullResult = await this.pullFromServer(token, options);
        result.pulled = pullResult.pulled;
        if (pullResult.conflicts) {
          result.conflicts = [...(result.conflicts || []), ...pullResult.conflicts];
        }
      }

      // 3. 충돌 해결
      if (result.conflicts && result.conflicts.length > 0) {
        if (options.force) {
          // 강제 모드: 충돌 무시
          result.conflicts = [];
        } else if (options.conflictStrategy) {
          this.emitProgress({ total: result.conflicts.length, current: 0, phase: 'resolving' });
          result.conflicts = await this.resolveConflicts(result.conflicts, options.conflictStrategy);
        }
      }

      // 4. 완료
      this.state.lastSyncAt = new Date().toISOString();
      result.success = !result.conflicts || result.conflicts.length === 0;

      this.emitProgress({ total: 1, current: 1, phase: 'completing' });
      this.emitEvent({ type: 'complete', direction, result, timestamp: new Date().toISOString() });

      return result;
    } catch (error) {
      const syncError = error instanceof RemoteSyncError
        ? error
        : RemoteSyncError.networkError(error instanceof Error ? error.message : 'Unknown error');

      this.emitEvent({ type: 'error', error: syncError, timestamp: new Date().toISOString() });
      throw syncError;
    } finally {
      this.state.isSyncing = false;
    }
  }

  private async pushToServer(
    rules: Rule[],
    token: string,
    options: { force?: boolean }
  ): Promise<Pick<RemoteSyncResult, 'pushed' | 'conflicts'>> {
    const pushed: string[] = [];
    const conflicts: RemoteSyncConflict[] = [];

    // 배치로 처리
    for (let i = 0; i < rules.length; i += this.config.batchSize) {
      const batch = rules.slice(i, i + this.config.batchSize);
      this.emitProgress({
        total: rules.length,
        current: i,
        phase: 'pushing',
        currentItem: batch[0]?.id,
      });

      try {
        const response = await this.fetch(`/api/teams/${this.config.teamId}/rules/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rules: batch,
            force: options.force,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          pushed.push(...(data.created || []).map((r: { id: string }) => r.id));
          pushed.push(...(data.updated || []).map((r: { id: string }) => r.id));

          if (data.conflicts) {
            conflicts.push(...data.conflicts);
          }
        } else if (response.status === 409) {
          // 충돌
          const data = await response.json();
          conflicts.push(...(data.conflicts || []));
        } else {
          throw RemoteSyncError.serverError(response.status);
        }
      } catch (error) {
        if (error instanceof RemoteSyncError) throw error;

        // 개별 규칙 푸시로 fallback
        for (const rule of batch) {
          try {
            const singleResponse = await this.fetch(`/api/teams/${this.config.teamId}/rules`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(rule),
            });

            if (singleResponse.ok) {
              pushed.push(rule.id);
            } else if (singleResponse.status === 409) {
              const data = await singleResponse.json();
              conflicts.push(data.conflict || {
                ruleId: rule.id,
                type: 'concurrent_modification',
                localRule: rule,
              });
            }
          } catch {
            // 오프라인 큐에 추가
            if (this.config.offlineQueue) {
              await this.addToOfflineQueue('push', rule.id, rule);
            }
          }
        }
      }
    }

    return {
      pushed: { count: pushed.length, rules: pushed },
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }

  private async pullFromServer(
    token: string,
    options: { since?: string }
  ): Promise<Pick<RemoteSyncResult, 'pulled' | 'conflicts'>> {
    const queryParams = new URLSearchParams();
    if (options.since) {
      queryParams.set('since', options.since);
    } else if (this.state.lastSyncAt) {
      queryParams.set('since', this.state.lastSyncAt);
    }

    const query = queryParams.toString();
    const endpoint = `/api/teams/${this.config.teamId}/rules${query ? '?' + query : ''}`;

    try {
      const response = await this.fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw RemoteSyncError.serverError(response.status);
      }

      const data = await response.json();
      const rules = data.rules || data;

      return {
        pulled: {
          count: rules.length,
          rules: rules.map((r: SharedRule) => r.id),
        },
      };
    } catch (error) {
      if (error instanceof RemoteSyncError) throw error;
      throw RemoteSyncError.networkError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async resolveConflicts(
    conflicts: RemoteSyncConflict[],
    strategy: ConflictResolutionStrategy
  ): Promise<RemoteSyncConflict[]> {
    const unresolved: RemoteSyncConflict[] = [];

    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      this.emitProgress({
        total: conflicts.length,
        current: i,
        phase: 'resolving',
        currentItem: conflict.ruleId,
      });

      switch (strategy) {
        case 'local-wins':
          // 로컬 규칙으로 덮어쓰기
          if (conflict.localRule) {
            const token = await this.config.authManager.getAccessToken();
            if (token) {
              await this.fetch(`/api/teams/${this.config.teamId}/rules/${conflict.ruleId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...conflict.localRule, force: true }),
              });
            }
          }
          break;

        case 'remote-wins':
          // 원격 규칙 유지 (아무것도 안 함)
          break;

        case 'manual':
        default:
          // 수동 해결 필요
          unresolved.push(conflict);
          this.emitEvent({
            type: 'conflict',
            timestamp: new Date().toISOString(),
          });
          break;
      }
    }

    return unresolved;
  }

  // ==========================================================================
  // Offline Queue Management
  // ==========================================================================

  private async loadOfflineQueue(): Promise<void> {
    try {
      const content = await fs.readFile(this.config.queuePath, 'utf-8');
      this.offlineQueue = JSON.parse(content);
    } catch {
      this.offlineQueue = [];
    }
  }

  private async saveOfflineQueue(): Promise<void> {
    const dir = path.dirname(this.config.queuePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.config.queuePath, JSON.stringify(this.offlineQueue, null, 2), 'utf-8');
  }

  private async addToOfflineQueue(
    type: 'push' | 'pull' | 'delete',
    ruleId?: string,
    rule?: Rule
  ): Promise<void> {
    const item: OfflineQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      ruleId,
      rule,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    this.offlineQueue.push(item);
    await this.saveOfflineQueue();

    this.emitEvent({
      type: 'offline_queued',
      queueItem: item,
      timestamp: new Date().toISOString(),
    });
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queue) {
      try {
        if (item.type === 'push' && item.rule) {
          await this.pushRule(item.rule);
        } else if (item.type === 'delete' && item.ruleId) {
          await this.deleteRule(item.ruleId);
        }
      } catch (error) {
        item.retryCount++;
        item.lastError = error instanceof Error ? error.message : 'Unknown error';

        if (item.retryCount < this.config.retryCount) {
          this.offlineQueue.push(item);
        }
      }
    }

    await this.saveOfflineQueue();
  }

  /**
   * 오프라인 큐 반환
   */
  getOfflineQueue(): OfflineQueueItem[] {
    return [...this.offlineQueue];
  }

  /**
   * 오프라인 큐 클리어
   */
  async clearOfflineQueue(): Promise<void> {
    this.offlineQueue = [];
    await this.saveOfflineQueue();
  }

  // ==========================================================================
  // Auto Sync
  // ==========================================================================

  private startAutoSync(): void {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(async () => {
      if (!this.state.isSyncing && !this.state.isOffline) {
        await this.checkConnection();

        if (!this.state.isOffline && this.offlineQueue.length > 0) {
          await this.processOfflineQueue();
        }
      }
    }, this.config.syncInterval);
  }

  /**
   * 자동 동기화 중지
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // ==========================================================================
  // HTTP Helper
  // ==========================================================================

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.serverUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw RemoteSyncError.networkError('요청 시간 초과');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * 리소스 정리
   */
  destroy(): void {
    this.stopAutoSync();
    this.progressListeners.clear();
    this.eventListeners.clear();
  }
}

// ============================================================================
// Singleton Helper
// ============================================================================

let remoteSyncInstance: RemoteSyncService | null = null;

/**
 * RemoteSyncService 싱글톤 인스턴스 반환
 */
export function getRemoteSyncService(config?: RemoteSyncServiceConfig): RemoteSyncService {
  if (!remoteSyncInstance && config) {
    remoteSyncInstance = new RemoteSyncService(config);
  }

  if (!remoteSyncInstance) {
    throw new Error('RemoteSyncService가 초기화되지 않았습니다. config를 전달하세요.');
  }

  return remoteSyncInstance;
}
