/**
 * Proposal State Machine
 * 제안의 상태 전이를 관리하는 상태 머신
 */

export type ProposalStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'MERGED'
  | 'CANCELLED';

export type ProposalAction =
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'REQUEST_CHANGES'
  | 'MERGE'
  | 'CANCEL'
  | 'REOPEN';

interface StateTransition {
  from: ProposalStatus[];
  to: ProposalStatus;
  action: ProposalAction;
  guard?: (context: TransitionContext) => boolean;
}

interface TransitionContext {
  currentApprovals: number;
  requiredApprovals: number;
  isAuthor: boolean;
  isAdmin: boolean;
  hasRejection: boolean;
}

// State machine definition
const transitions: StateTransition[] = [
  // DRAFT -> PENDING (제출)
  {
    from: ['DRAFT'],
    to: 'PENDING',
    action: 'SUBMIT',
    guard: (ctx) => ctx.isAuthor,
  },

  // PENDING -> APPROVED (필요 승인 수 충족)
  {
    from: ['PENDING'],
    to: 'APPROVED',
    action: 'APPROVE',
    guard: (ctx) => ctx.currentApprovals >= ctx.requiredApprovals,
  },

  // PENDING -> REJECTED (거절)
  {
    from: ['PENDING'],
    to: 'REJECTED',
    action: 'REJECT',
  },

  // APPROVED -> MERGED (병합)
  {
    from: ['APPROVED'],
    to: 'MERGED',
    action: 'MERGE',
    guard: (ctx) => ctx.isAdmin || ctx.isAuthor,
  },

  // DRAFT, PENDING -> CANCELLED (취소)
  {
    from: ['DRAFT', 'PENDING'],
    to: 'CANCELLED',
    action: 'CANCEL',
    guard: (ctx) => ctx.isAuthor || ctx.isAdmin,
  },

  // REJECTED -> PENDING (재제출)
  {
    from: ['REJECTED'],
    to: 'PENDING',
    action: 'REOPEN',
    guard: (ctx) => ctx.isAuthor,
  },
];

export class ProposalStateMachine {
  private currentState: ProposalStatus;

  constructor(initialState: ProposalStatus = 'DRAFT') {
    this.currentState = initialState;
  }

  get state(): ProposalStatus {
    return this.currentState;
  }

  /**
   * 상태 전이 가능 여부 확인
   */
  canTransition(action: ProposalAction, context: TransitionContext): boolean {
    const transition = this.findTransition(action);
    if (!transition) return false;

    if (!transition.from.includes(this.currentState)) return false;

    if (transition.guard && !transition.guard(context)) return false;

    return true;
  }

  /**
   * 상태 전이 실행
   */
  transition(action: ProposalAction, context: TransitionContext): ProposalStatus {
    if (!this.canTransition(action, context)) {
      throw new Error(
        `Cannot transition from ${this.currentState} with action ${action}`
      );
    }

    const transition = this.findTransition(action)!;
    this.currentState = transition.to;
    return this.currentState;
  }

  /**
   * 현재 상태에서 가능한 액션 목록
   */
  getAvailableActions(context: TransitionContext): ProposalAction[] {
    return transitions
      .filter((t) => t.from.includes(this.currentState))
      .filter((t) => !t.guard || t.guard(context))
      .map((t) => t.action);
  }

  /**
   * 다음 상태 미리보기
   */
  peekNextState(action: ProposalAction): ProposalStatus | null {
    const transition = this.findTransition(action);
    if (!transition || !transition.from.includes(this.currentState)) {
      return null;
    }
    return transition.to;
  }

  private findTransition(action: ProposalAction): StateTransition | undefined {
    return transitions.find((t) => t.action === action);
  }
}

// Helper functions
export function createContext(params: {
  currentApprovals: number;
  requiredApprovals: number;
  userId: string;
  authorId: string;
  userRole: string;
}): TransitionContext {
  return {
    currentApprovals: params.currentApprovals,
    requiredApprovals: params.requiredApprovals,
    isAuthor: params.userId === params.authorId,
    isAdmin: ['ADMIN', 'OWNER'].includes(params.userRole),
    hasRejection: false,
  };
}

export function getStatusColor(status: ProposalStatus): string {
  const colors: Record<ProposalStatus, string> = {
    DRAFT: 'gray',
    PENDING: 'yellow',
    APPROVED: 'green',
    REJECTED: 'red',
    MERGED: 'blue',
    CANCELLED: 'gray',
  };
  return colors[status];
}

export function getStatusLabel(status: ProposalStatus): string {
  const labels: Record<ProposalStatus, string> = {
    DRAFT: '초안',
    PENDING: '검토 대기',
    APPROVED: '승인됨',
    REJECTED: '거절됨',
    MERGED: '병합됨',
    CANCELLED: '취소됨',
  };
  return labels[status];
}
