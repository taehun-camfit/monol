/**
 * API Hooks
 * TanStack Query hooks for API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Team,
  Rule,
  Proposal,
  User,
  PaginatedResponse,
  TeamAnalytics,
  RuleAnalytics,
  ProposalAnalytics,
} from './types';

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  teams: {
    all: ['teams'] as const,
    detail: (id: string) => ['teams', id] as const,
    members: (id: string) => ['teams', id, 'members'] as const,
  },
  rules: {
    all: ['rules'] as const,
    list: (params?: Record<string, unknown>) => ['rules', 'list', params] as const,
    detail: (id: string) => ['rules', id] as const,
    team: (teamId: string, params?: Record<string, unknown>) =>
      ['teams', teamId, 'rules', params] as const,
    history: (teamId: string, ruleId: string) =>
      ['teams', teamId, 'rules', ruleId, 'history'] as const,
  },
  proposals: {
    list: (teamId: string, params?: Record<string, unknown>) =>
      ['teams', teamId, 'proposals', params] as const,
    detail: (teamId: string, id: string) => ['teams', teamId, 'proposals', id] as const,
  },
  marketplace: {
    rules: (params?: Record<string, unknown>) => ['marketplace', 'rules', params] as const,
    trending: () => ['marketplace', 'trending'] as const,
    categories: () => ['marketplace', 'categories'] as const,
    collections: () => ['marketplace', 'collections'] as const,
    detail: (ruleId: string) => ['marketplace', 'rules', ruleId] as const,
  },
  analytics: {
    overview: (teamId: string) => ['teams', teamId, 'analytics', 'overview'] as const,
    rules: (teamId: string) => ['teams', teamId, 'analytics', 'rules'] as const,
    proposals: (teamId: string) => ['teams', teamId, 'analytics', 'proposals'] as const,
    members: (teamId: string) => ['teams', teamId, 'analytics', 'members'] as const,
    activity: (teamId: string, days?: number) =>
      ['teams', teamId, 'analytics', 'activity', days] as const,
    personal: () => ['users', 'me', 'analytics'] as const,
  },
  user: {
    me: ['user', 'me'] as const,
  },
};

// ============================================================================
// Auth Hooks
// ============================================================================

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.user.me,
    queryFn: () => api.get<User>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Team Hooks
// ============================================================================

export function useTeams() {
  return useQuery({
    queryKey: queryKeys.teams.all,
    queryFn: () => api.get<{ teams: Team[] }>('/teams'),
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: queryKeys.teams.detail(teamId),
    queryFn: () => api.get<Team>(`/teams/${teamId}`),
    enabled: !!teamId,
  });
}

export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: queryKeys.teams.members(teamId),
    queryFn: () => api.get<{ members: unknown[] }>(`/teams/${teamId}/members`),
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<Team>('/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });
}

// ============================================================================
// Rule Hooks
// ============================================================================

export function useRules(params?: {
  teamId?: string;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.rules.list(params),
    queryFn: () => api.get<PaginatedResponse<Rule>>('/rules', params),
  });
}

export function useTeamRules(teamId: string, params?: {
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.rules.team(teamId, params),
    queryFn: () => api.get<PaginatedResponse<Rule>>(`/teams/${teamId}/rules`, params),
    enabled: !!teamId,
  });
}

export function useRule(ruleId: string) {
  return useQuery({
    queryKey: queryKeys.rules.detail(ruleId),
    queryFn: () => api.get<Rule>(`/rules/${ruleId}`),
    enabled: !!ruleId,
  });
}

export function useCreateRule(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Rule>) =>
      api.post<Rule>(`/teams/${teamId}/rules`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.team(teamId) });
    },
  });
}

export function useUpdateRule(teamId: string, ruleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Rule>) =>
      api.patch<Rule>(`/teams/${teamId}/rules/${ruleId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.team(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.detail(ruleId) });
    },
  });
}

export function useDeleteRule(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      api.delete<{ success: boolean }>(`/teams/${teamId}/rules/${ruleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.team(teamId) });
    },
  });
}

// ============================================================================
// Proposal Hooks
// ============================================================================

export function useProposals(teamId: string, params?: {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.proposals.list(teamId, params),
    queryFn: () => api.get<PaginatedResponse<Proposal>>(`/teams/${teamId}/proposals`, params),
    enabled: !!teamId,
  });
}

export function useProposal(teamId: string, proposalId: string) {
  return useQuery({
    queryKey: queryKeys.proposals.detail(teamId, proposalId),
    queryFn: () => api.get<Proposal>(`/teams/${teamId}/proposals/${proposalId}`),
    enabled: !!teamId && !!proposalId,
  });
}

export function useCreateProposal(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Proposal>) =>
      api.post<Proposal>(`/teams/${teamId}/proposals`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.list(teamId) });
    },
  });
}

export function useSubmitProposal(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) =>
      api.post<Proposal>(`/teams/${teamId}/proposals/${proposalId}/submit`),
    onSuccess: (_, proposalId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.list(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(teamId, proposalId) });
    },
  });
}

export function useReviewProposal(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      proposalId,
      decision,
      comment,
    }: {
      proposalId: string;
      decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
      comment?: string;
    }) =>
      api.post<Proposal>(`/teams/${teamId}/proposals/${proposalId}/review`, {
        decision,
        comment,
      }),
    onSuccess: (_, { proposalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.list(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(teamId, proposalId) });
    },
  });
}

export function useMergeProposal(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) =>
      api.post<Proposal>(`/teams/${teamId}/proposals/${proposalId}/merge`),
    onSuccess: (_, proposalId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.list(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(teamId, proposalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.team(teamId) });
    },
  });
}

// ============================================================================
// Marketplace Hooks
// ============================================================================

export function useMarketplaceRules(params?: {
  q?: string;
  category?: string;
  tags?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.marketplace.rules(params),
    queryFn: () => api.get<PaginatedResponse<Rule>>('/marketplace/rules', params),
  });
}

export function useMarketplaceRule(ruleId: string) {
  return useQuery({
    queryKey: queryKeys.marketplace.detail(ruleId),
    queryFn: () => api.get<Rule>(`/marketplace/rules/${ruleId}`),
    enabled: !!ruleId,
  });
}

export function useTrendingRules() {
  return useQuery({
    queryKey: queryKeys.marketplace.trending(),
    queryFn: () => api.get<{ rules: Rule[] }>('/marketplace/trending'),
  });
}

export function useMarketplaceCategories() {
  return useQuery({
    queryKey: queryKeys.marketplace.categories(),
    queryFn: () => api.get<{ categories: { name: string; count: number }[] }>('/marketplace/categories'),
  });
}

export function useAdoptRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ruleId,
      teamId,
      pinnedVersion,
      customizations,
    }: {
      ruleId: string;
      teamId: string;
      pinnedVersion?: string;
      customizations?: Record<string, unknown>;
    }) =>
      api.post(`/marketplace/rules/${ruleId}/adopt`, {
        teamId,
        pinnedVersion,
        customizations,
      }),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.team(teamId) });
    },
  });
}

// ============================================================================
// Analytics Hooks
// ============================================================================

export function useTeamAnalyticsOverview(teamId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.overview(teamId),
    queryFn: () => api.get<TeamAnalytics>(`/teams/${teamId}/analytics/overview`),
    enabled: !!teamId,
  });
}

export function useRuleAnalytics(teamId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.rules(teamId),
    queryFn: () => api.get<RuleAnalytics>(`/teams/${teamId}/analytics/rules`),
    enabled: !!teamId,
  });
}

export function useProposalAnalytics(teamId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.proposals(teamId),
    queryFn: () => api.get<ProposalAnalytics>(`/teams/${teamId}/analytics/proposals`),
    enabled: !!teamId,
  });
}

export function useMemberAnalytics(teamId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.members(teamId),
    queryFn: () => api.get(`/teams/${teamId}/analytics/members`),
    enabled: !!teamId,
  });
}

export function useActivityTimeline(teamId: string, days = 30) {
  return useQuery({
    queryKey: queryKeys.analytics.activity(teamId, days),
    queryFn: () => api.get(`/teams/${teamId}/analytics/activity`, { days }),
    enabled: !!teamId,
  });
}

export function usePersonalAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics.personal(),
    queryFn: () => api.get('/users/me/analytics'),
  });
}
