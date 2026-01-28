// Rulebook API Client
const API_BASE = 'http://localhost:3001/api';

// API Helper
async function api(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API Error');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Auth
export async function getMe() {
  return api('/auth/me');
}

// Teams
export async function getTeams() {
  return api('/teams');
}

export async function getTeam(teamId) {
  return api(`/teams/${teamId}`);
}

export async function getTeamMembers(teamId) {
  return api(`/teams/${teamId}/members`);
}

// Rules
export async function getRules(teamId, params = {}) {
  const query = new URLSearchParams(params).toString();
  return api(`/teams/${teamId}/rules${query ? '?' + query : ''}`);
}

export async function getRule(teamId, ruleId) {
  return api(`/teams/${teamId}/rules/${ruleId}`);
}

export async function createRule(teamId, rule) {
  return api(`/teams/${teamId}/rules`, {
    method: 'POST',
    body: JSON.stringify(rule)
  });
}

export async function updateRule(teamId, ruleId, updates) {
  return api(`/teams/${teamId}/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteRule(teamId, ruleId) {
  return api(`/teams/${teamId}/rules/${ruleId}`, {
    method: 'DELETE'
  });
}

export async function adoptRule(teamId, ruleId) {
  return api(`/teams/${teamId}/rules/${ruleId}/adopt`, {
    method: 'POST'
  });
}

export async function getRuleHistory(teamId, ruleId) {
  return api(`/teams/${teamId}/rules/${ruleId}/history`);
}

export async function getRuleDiscussions(teamId, ruleId) {
  return api(`/teams/${teamId}/rules/${ruleId}/discussions`);
}

export async function createDiscussion(teamId, ruleId, content) {
  return api(`/teams/${teamId}/rules/${ruleId}/discussions`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}

export async function createReply(discussionId, content) {
  return api(`/discussions/${discussionId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}

export async function likeDiscussion(discussionId) {
  return api(`/discussions/${discussionId}/like`, {
    method: 'POST'
  });
}

// Proposals
export async function getProposals(teamId, params = {}) {
  const query = new URLSearchParams(params).toString();
  return api(`/teams/${teamId}/proposals${query ? '?' + query : ''}`);
}

export async function getProposal(teamId, proposalId) {
  return api(`/teams/${teamId}/proposals/${proposalId}`);
}

export async function createProposal(teamId, proposal) {
  return api(`/teams/${teamId}/proposals`, {
    method: 'POST',
    body: JSON.stringify(proposal)
  });
}

export async function reviewProposal(teamId, proposalId, review) {
  return api(`/teams/${teamId}/proposals/${proposalId}/review`, {
    method: 'POST',
    body: JSON.stringify(review)
  });
}

export async function mergeProposal(teamId, proposalId) {
  return api(`/teams/${teamId}/proposals/${proposalId}/merge`, {
    method: 'POST'
  });
}

// Marketplace
export async function searchMarketplace(params = {}) {
  const query = new URLSearchParams(params).toString();
  return api(`/marketplace/rules${query ? '?' + query : ''}`);
}

export async function getMarketplaceRule(ruleId) {
  return api(`/marketplace/rules/${ruleId}`);
}

export async function getCollections() {
  return api('/marketplace/collections');
}

export async function getCollection(collectionId) {
  return api(`/marketplace/collections/${collectionId}`);
}

export async function getTrending() {
  return api('/marketplace/trending');
}

export async function getCategories() {
  return api('/marketplace/categories');
}

// Analytics
export async function getAnalyticsOverview(teamId, period = 30) {
  return api(`/teams/${teamId}/analytics/overview?period=${period}`);
}

export async function getAnalyticsActivity(teamId, params = {}) {
  const query = new URLSearchParams(params).toString();
  return api(`/teams/${teamId}/analytics/activity${query ? '?' + query : ''}`);
}

export async function getAnalyticsContributors(teamId, sort = 'points') {
  return api(`/teams/${teamId}/analytics/contributors?sort=${sort}`);
}

export async function getAnalyticsTags(teamId) {
  return api(`/teams/${teamId}/analytics/tags`);
}

// Notifications
export async function getNotifications() {
  return api('/notifications');
}

export async function markNotificationRead(notificationId) {
  return api(`/notifications/${notificationId}`, {
    method: 'PATCH'
  });
}

export async function markAllNotificationsRead() {
  return api('/notifications/read-all', {
    method: 'POST'
  });
}

// Export all as default
export default {
  getMe,
  getTeams,
  getTeam,
  getTeamMembers,
  getRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  adoptRule,
  getRuleHistory,
  getRuleDiscussions,
  createDiscussion,
  createReply,
  likeDiscussion,
  getProposals,
  getProposal,
  createProposal,
  reviewProposal,
  mergeProposal,
  searchMarketplace,
  getMarketplaceRule,
  getCollections,
  getCollection,
  getTrending,
  getCategories,
  getAnalyticsOverview,
  getAnalyticsActivity,
  getAnalyticsContributors,
  getAnalyticsTags,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
