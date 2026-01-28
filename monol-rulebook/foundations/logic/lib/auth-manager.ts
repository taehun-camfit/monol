/**
 * Monol Rulebook - Auth Manager
 *
 * 인증 토큰 관리 및 GitHub OAuth 처리
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { RulebookError } from './errors.js';
import type { User, AuthToken, AuthState } from './types.js';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * 인증 관련 에러
 */
export class AuthError extends RulebookError {
  readonly statusCode?: number;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      file?: string;
    } = {}
  ) {
    super(options.code || 'AUTH_ERROR', message, {
      file: options.file,
      suggestion: '로그인을 다시 시도하세요.',
    });

    this.name = 'AuthError';
    this.statusCode = options.statusCode;
  }

  static tokenExpired(): AuthError {
    return new AuthError('인증 토큰이 만료되었습니다', {
      code: 'TOKEN_EXPIRED',
      statusCode: 401,
    });
  }

  static invalidToken(): AuthError {
    return new AuthError('유효하지 않은 인증 토큰입니다', {
      code: 'INVALID_TOKEN',
      statusCode: 401,
    });
  }

  static refreshFailed(reason?: string): AuthError {
    return new AuthError(`토큰 갱신 실패${reason ? `: ${reason}` : ''}`, {
      code: 'REFRESH_FAILED',
      statusCode: 401,
    });
  }

  static networkError(reason?: string): AuthError {
    return new AuthError(`네트워크 오류${reason ? `: ${reason}` : ''}`, {
      code: 'NETWORK_ERROR',
    });
  }

  static unauthorized(): AuthError {
    return new AuthError('인증이 필요합니다', {
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }

  static forbidden(resource?: string): AuthError {
    return new AuthError(`접근 권한이 없습니다${resource ? `: ${resource}` : ''}`, {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }
}

// ============================================================================
// Types
// ============================================================================

/** Auth Manager 설정 */
export interface AuthManagerConfig {
  /** 서버 URL */
  serverUrl: string;

  /** 토큰 저장 경로 (기본: ~/.config/monol/auth.json) */
  tokenPath?: string;

  /** 토큰 만료 전 갱신 여유 시간 (ms, 기본: 5분) */
  refreshBuffer?: number;

  /** 요청 타임아웃 (ms, 기본: 30초) */
  timeout?: number;

  /** 자동 토큰 갱신 활성화 (기본: true) */
  autoRefresh?: boolean;
}

/** 저장된 인증 데이터 */
interface StoredAuthData {
  token: AuthToken;
  user: User;
  serverUrl: string;
  storedAt: string;
}

/** OAuth 콜백 결과 */
export interface OAuthCallbackResult {
  success: boolean;
  user?: User;
  token?: AuthToken;
  error?: string;
}

/** 이벤트 리스너 */
export type AuthEventListener = (event: AuthEvent) => void;

export interface AuthEvent {
  type: 'login' | 'logout' | 'token_refreshed' | 'token_expired' | 'error';
  user?: User;
  error?: AuthError;
  timestamp: string;
}

// ============================================================================
// Auth Manager Class
// ============================================================================

/**
 * 인증 관리자
 *
 * - 토큰 저장/로드 (파일 기반)
 * - 토큰 자동 갱신
 * - GitHub OAuth 처리
 * - 인증 상태 관리
 */
export class AuthManager {
  private config: Required<AuthManagerConfig>;
  private authState: AuthState;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<AuthEventListener> = new Set();

  constructor(config: AuthManagerConfig) {
    const defaultTokenPath = path.join(os.homedir(), '.config', 'monol', 'auth.json');

    this.config = {
      serverUrl: config.serverUrl,
      tokenPath: config.tokenPath || defaultTokenPath,
      refreshBuffer: config.refreshBuffer || 5 * 60 * 1000, // 5분
      timeout: config.timeout || 30 * 1000, // 30초
      autoRefresh: config.autoRefresh ?? true,
    };

    this.authState = {
      isAuthenticated: false,
    };
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * 저장된 인증 정보 로드 및 초기화
   */
  async initialize(): Promise<AuthState> {
    try {
      const stored = await this.loadStoredAuth();

      if (stored && stored.serverUrl === this.config.serverUrl) {
        // 토큰 만료 확인
        if (this.isTokenExpired(stored.token)) {
          // 만료됨 - 갱신 시도
          if (stored.token.refreshToken) {
            try {
              await this.refreshToken(stored.token.refreshToken);
              return this.authState;
            } catch {
              // 갱신 실패 - 로그아웃 상태로
              await this.clearStoredAuth();
            }
          } else {
            await this.clearStoredAuth();
          }
        } else {
          // 유효한 토큰
          this.authState = {
            isAuthenticated: true,
            user: stored.user,
            token: stored.token,
            lastRefreshed: stored.storedAt,
          };

          // 자동 갱신 스케줄링
          if (this.config.autoRefresh) {
            this.scheduleRefresh(stored.token);
          }
        }
      }
    } catch (error) {
      // 로드 실패 - 로그아웃 상태 유지
      console.error('[AuthManager] Failed to load stored auth:', error);
    }

    return this.authState;
  }

  /**
   * 현재 인증 상태 반환
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * 인증 여부 확인
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.token && !this.isTokenExpired(this.authState.token);
  }

  /**
   * 현재 사용자 반환
   */
  getCurrentUser(): User | undefined {
    return this.authState.user;
  }

  /**
   * 현재 액세스 토큰 반환
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.authState.token) {
      return null;
    }

    // 만료 임박 시 갱신
    if (this.isTokenExpiringSoon(this.authState.token)) {
      if (this.authState.token.refreshToken) {
        try {
          await this.refreshToken(this.authState.token.refreshToken);
        } catch {
          // 갱신 실패 시 기존 토큰 반환 (아직 유효하면)
          if (this.isTokenExpired(this.authState.token)) {
            return null;
          }
        }
      }
    }

    return this.authState.token?.accessToken || null;
  }

  /**
   * GitHub OAuth 로그인 URL 생성
   */
  getGitHubOAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      redirect_uri: `${this.config.serverUrl}/auth/github/callback`,
    });

    if (state) {
      params.set('state', state);
    }

    return `${this.config.serverUrl}/auth/github?${params.toString()}`;
  }

  /**
   * GitHub OAuth 콜백 처리
   */
  async handleOAuthCallback(code: string, state?: string): Promise<OAuthCallbackResult> {
    try {
      const response = await this.fetch('/auth/github/callback', {
        method: 'POST',
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'OAuth 처리 실패' }));
        return {
          success: false,
          error: error.message || 'OAuth 처리 실패',
        };
      }

      const data = await response.json();
      const { user, token } = data;

      // 인증 상태 업데이트
      this.authState = {
        isAuthenticated: true,
        user,
        token,
        lastRefreshed: new Date().toISOString(),
      };

      // 토큰 저장
      await this.saveAuth(user, token);

      // 자동 갱신 스케줄링
      if (this.config.autoRefresh) {
        this.scheduleRefresh(token);
      }

      this.emit({ type: 'login', user, timestamp: new Date().toISOString() });

      return { success: true, user, token };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth 처리 중 오류 발생';
      return { success: false, error: message };
    }
  }

  /**
   * 토큰으로 직접 로그인 (개발/테스트용)
   */
  async loginWithToken(accessToken: string): Promise<OAuthCallbackResult> {
    try {
      // 토큰으로 사용자 정보 조회
      const response = await this.fetch('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return { success: false, error: '유효하지 않은 토큰입니다' };
      }

      const user = await response.json();
      const token: AuthToken = {
        accessToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간
        tokenType: 'Bearer',
      };

      this.authState = {
        isAuthenticated: true,
        user,
        token,
        lastRefreshed: new Date().toISOString(),
      };

      await this.saveAuth(user, token);

      this.emit({ type: 'login', user, timestamp: new Date().toISOString() });

      return { success: true, user, token };
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인 실패';
      return { success: false, error: message };
    }
  }

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    const user = this.authState.user;

    // 서버에 로그아웃 알림 (실패해도 계속 진행)
    if (this.authState.token) {
      try {
        await this.fetch('/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.authState.token.accessToken}`,
          },
        });
      } catch {
        // 무시
      }
    }

    // 상태 초기화
    this.authState = { isAuthenticated: false };

    // 저장된 토큰 삭제
    await this.clearStoredAuth();

    // 갱신 타이머 취소
    this.cancelRefreshTimer();

    this.emit({ type: 'logout', user, timestamp: new Date().toISOString() });
  }

  /**
   * 토큰 수동 갱신
   */
  async refreshToken(refreshToken?: string): Promise<AuthToken> {
    const token = refreshToken || this.authState.token?.refreshToken;

    if (!token) {
      throw AuthError.refreshFailed('리프레시 토큰이 없습니다');
    }

    try {
      const response = await this.fetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: token }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: '토큰 갱신 실패' }));
        throw AuthError.refreshFailed(error.message);
      }

      const data = await response.json();
      const newToken: AuthToken = data.token;

      // 상태 업데이트
      this.authState = {
        ...this.authState,
        token: newToken,
        lastRefreshed: new Date().toISOString(),
      };

      // 저장
      if (this.authState.user) {
        await this.saveAuth(this.authState.user, newToken);
      }

      // 다음 갱신 스케줄링
      if (this.config.autoRefresh) {
        this.scheduleRefresh(newToken);
      }

      this.emit({ type: 'token_refreshed', user: this.authState.user, timestamp: new Date().toISOString() });

      return newToken;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.refreshFailed(error instanceof Error ? error.message : '알 수 없는 오류');
    }
  }

  /**
   * 인증된 API 요청 헬퍼
   */
  async authenticatedFetch(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAccessToken();

    if (!token) {
      throw AuthError.unauthorized();
    }

    return this.fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * 이벤트 리스너 등록
   */
  on(listener: AuthEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 이벤트 리스너 제거
   */
  off(listener: AuthEventListener): void {
    this.listeners.delete(listener);
  }

  private emit(event: AuthEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // 리스너 에러 무시
      }
    }
  }

  // ==========================================================================
  // Token Management
  // ==========================================================================

  private isTokenExpired(token: AuthToken): boolean {
    const expiresAt = new Date(token.expiresAt).getTime();
    return Date.now() >= expiresAt;
  }

  private isTokenExpiringSoon(token: AuthToken): boolean {
    const expiresAt = new Date(token.expiresAt).getTime();
    return Date.now() >= expiresAt - this.config.refreshBuffer;
  }

  private scheduleRefresh(token: AuthToken): void {
    this.cancelRefreshTimer();

    if (!token.refreshToken) {
      return;
    }

    const expiresAt = new Date(token.expiresAt).getTime();
    const refreshAt = expiresAt - this.config.refreshBuffer;
    const delay = Math.max(refreshAt - Date.now(), 0);

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken(token.refreshToken);
      } catch (error) {
        this.emit({
          type: 'token_expired',
          user: this.authState.user,
          error: error instanceof AuthError ? error : AuthError.tokenExpired(),
          timestamp: new Date().toISOString(),
        });
      }
    }, delay);
  }

  private cancelRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ==========================================================================
  // Storage
  // ==========================================================================

  private async loadStoredAuth(): Promise<StoredAuthData | null> {
    try {
      const content = await fs.readFile(this.config.tokenPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async saveAuth(user: User, token: AuthToken): Promise<void> {
    const data: StoredAuthData = {
      token,
      user,
      serverUrl: this.config.serverUrl,
      storedAt: new Date().toISOString(),
    };

    const dir = path.dirname(this.config.tokenPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.config.tokenPath, JSON.stringify(data, null, 2), 'utf-8');

    // 파일 권한 제한 (소유자만 읽기/쓰기)
    try {
      await fs.chmod(this.config.tokenPath, 0o600);
    } catch {
      // Windows에서는 chmod가 제한적
    }
  }

  private async clearStoredAuth(): Promise<void> {
    try {
      await fs.unlink(this.config.tokenPath);
    } catch {
      // 파일이 없어도 무시
    }
  }

  // ==========================================================================
  // HTTP
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
        throw AuthError.networkError('요청 시간 초과');
      }
      throw AuthError.networkError(error instanceof Error ? error.message : '알 수 없는 오류');
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
    this.cancelRefreshTimer();
    this.listeners.clear();
  }
}

// ============================================================================
// Singleton Helper
// ============================================================================

let defaultInstance: AuthManager | null = null;

/**
 * 기본 AuthManager 인스턴스 반환
 */
export function getAuthManager(config?: AuthManagerConfig): AuthManager {
  if (!defaultInstance && config) {
    defaultInstance = new AuthManager(config);
  }

  if (!defaultInstance) {
    throw new Error('AuthManager가 초기화되지 않았습니다. config를 전달하세요.');
  }

  return defaultInstance;
}

/**
 * 환경 변수에서 설정 로드
 */
export function loadAuthConfigFromEnv(): AuthManagerConfig | null {
  const serverUrl = process.env.MONOL_SERVER_URL;

  if (!serverUrl) {
    return null;
  }

  return {
    serverUrl,
    tokenPath: process.env.MONOL_TOKEN_PATH,
    refreshBuffer: process.env.MONOL_REFRESH_BUFFER
      ? parseInt(process.env.MONOL_REFRESH_BUFFER, 10)
      : undefined,
    timeout: process.env.MONOL_AUTH_TIMEOUT
      ? parseInt(process.env.MONOL_AUTH_TIMEOUT, 10)
      : undefined,
    autoRefresh: process.env.MONOL_AUTO_REFRESH !== 'false',
  };
}

export default AuthManager;
