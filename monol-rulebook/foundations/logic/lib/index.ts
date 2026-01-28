/**
 * Monol Rulebook - Library Index
 *
 * 모든 라이브러리 모듈을 내보냅니다.
 */

// Types
export * from './types.js';

// Core
export { RulebookManager, generateRuleId, validateRule, createRuleTemplate } from './rulebook-manager.js';
export { RuleSearch, quickSearchByTags, quickSearchByCategory, groupRulesByCategory, getRuleStats } from './rule-search.js';

// Versioning
export { RuleVersioning, parseVersion, initializeVersioning, formatDiff } from './rule-versioning.js';

// Sync
export { SyncManager, formatSyncDiff, formatConflicts } from './sync-manager.js';

// Conflict Resolution
export {
  ConflictResolver,
  getConflictResolver,
  type ConflictType,
  type ConflictInfo,
  type MergeResult,
  type ConflictResolverConfig,
} from './conflict-resolver.js';

// Server Sync (monol-server)
export {
  ServerSync,
  getServerSync,
  loadConfigFromEnv,
  type ServerSyncConfig,
  type ServerEventPayload,
  type ServerResponse,
  // Remote Sync Service
  RemoteSyncService,
  RemoteSyncError,
  getRemoteSyncService,
  type RemoteSyncServiceConfig,
  type SyncProgress,
  type SyncProgressListener,
  type SyncEventListener,
  type SyncEvent,
} from './server-sync.js';

// Auth
export {
  AuthManager,
  AuthError,
  getAuthManager,
  loadAuthConfigFromEnv,
  type AuthManagerConfig,
  type OAuthCallbackResult,
  type AuthEvent,
  type AuthEventListener,
} from './auth-manager.js';

// Errors
export {
  RulebookError,
  YAMLParseError,
  ValidationError,
  DependencyError,
  SyncError,
  VersionError,
  isRulebookError,
  categorizeError,
  formatError,
} from './errors.js';

// Adapters
export {
  BasePlatformAdapter,
  getSeverityIcon,
  ruleToMarkdown,
  rulesToMarkdownDocument,
  ruleToDirective,
  rulesToDirectives,
  registerAdapter,
  getAdapter,
  getAvailableAdapters,
} from './adapters/platform-adapter.js';
export { CursorAdapter } from './adapters/cursor-adapter.js';
export { ClaudeAdapter } from './adapters/claude-adapter.js';

// Default export (convenience)
import RulebookManagerDefault from './rulebook-manager.js';
export default RulebookManagerDefault;
