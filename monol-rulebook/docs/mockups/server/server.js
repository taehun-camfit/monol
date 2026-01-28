import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  users, teams, rules, proposals, marketplaceRules, collections,
  activities, discussions, contributors, analyticsData, tags
} from './data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve static files from prototype folder
app.use('/prototype', express.static(path.join(__dirname, '../prototype')));

// Helper: Paginate
function paginate(items, page = 1, limit = 20) {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    data: items.slice(start, end),
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit)
    }
  };
}

// Helper: Response
const success = (data, pagination) => pagination
  ? { success: true, data, pagination }
  : { success: true, data };

const error = (code, message) => ({
  success: false,
  error: { code, message }
});

// ============================================
// Auth
// ============================================

app.get('/api/auth/me', (req, res) => {
  res.json(success(users[0])); // 현재 사용자: Kent
});

// ============================================
// Users
// ============================================

app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json(error('USER_NOT_FOUND', '사용자를 찾을 수 없습니다.'));
  res.json(success(user));
});

app.get('/api/users/:id/activity', (req, res) => {
  const userActivities = activities.filter(a => a.user.id === req.params.id);
  res.json(success(userActivities));
});

// ============================================
// Teams
// ============================================

app.get('/api/teams', (req, res) => {
  res.json(success(teams));
});

app.get('/api/teams/:id', (req, res) => {
  const team = teams.find(t => t.id === req.params.id);
  if (!team) return res.status(404).json(error('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.'));
  res.json(success(team));
});

app.get('/api/teams/:id/members', (req, res) => {
  res.json(success(users)); // 모든 사용자가 팀 멤버라고 가정
});

// ============================================
// Rules
// ============================================

app.get('/api/teams/:teamId/rules', (req, res) => {
  let filtered = rules.filter(r => r.teamId === req.params.teamId);

  // Filters
  const { category, severity, tags: tagFilter, status, search, sort, order } = req.query;

  if (category) {
    filtered = filtered.filter(r => r.category.startsWith(category));
  }
  if (severity) {
    const severities = severity.split(',');
    filtered = filtered.filter(r => severities.includes(r.severity));
  }
  if (tagFilter) {
    const tagList = tagFilter.split(',');
    filtered = filtered.filter(r => tagList.some(t => r.tags.includes(t)));
  }
  if (status) {
    filtered = filtered.filter(r => r.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.ruleId.toLowerCase().includes(q)
    );
  }

  // Sort
  if (sort) {
    filtered.sort((a, b) => {
      const aVal = a[sort];
      const bVal = b[sort];
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return order === 'asc' ? cmp : -cmp;
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = paginate(filtered, page, limit);

  res.json(success(result.data, result.pagination));
});

app.get('/api/teams/:teamId/rules/:id', (req, res) => {
  const rule = rules.find(r => r.id === req.params.id || r.ruleId === req.params.id);
  if (!rule) return res.status(404).json(error('RULE_NOT_FOUND', '규칙을 찾을 수 없습니다.'));
  res.json(success(rule));
});

app.post('/api/teams/:teamId/rules', (req, res) => {
  const newRule = {
    id: String(rules.length + 1),
    ...req.body,
    author: users[0],
    version: '1.0.0',
    status: 'draft',
    adoptionRate: 0,
    likes: 0,
    comments: 0,
    teamId: req.params.teamId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  rules.push(newRule);
  res.status(201).json(success(newRule));
});

app.patch('/api/teams/:teamId/rules/:id', (req, res) => {
  const rule = rules.find(r => r.id === req.params.id);
  if (!rule) return res.status(404).json(error('RULE_NOT_FOUND', '규칙을 찾을 수 없습니다.'));

  Object.assign(rule, req.body, { updatedAt: new Date().toISOString() });
  res.json(success(rule));
});

app.delete('/api/teams/:teamId/rules/:id', (req, res) => {
  const index = rules.findIndex(r => r.id === req.params.id);
  if (index === -1) return res.status(404).json(error('RULE_NOT_FOUND', '규칙을 찾을 수 없습니다.'));

  rules.splice(index, 1);
  res.json(success({ deleted: true }));
});

app.post('/api/teams/:teamId/rules/:id/adopt', (req, res) => {
  const rule = rules.find(r => r.id === req.params.id);
  if (!rule) return res.status(404).json(error('RULE_NOT_FOUND', '규칙을 찾을 수 없습니다.'));

  rule.adopted = true;
  res.json(success({ adopted: true, rule }));
});

app.get('/api/teams/:teamId/rules/:id/history', (req, res) => {
  res.json(success([
    { version: '1.2.0', author: users[0], message: 'React 컴포넌트 파일명 예외 추가', date: '2025-01-19' },
    { version: '1.1.0', author: users[1], message: 'TypeScript 타입 예시 추가', date: '2025-01-15' },
    { version: '1.0.0', author: users[0], message: '초기 버전', date: '2025-01-10' }
  ]));
});

// ============================================
// Proposals
// ============================================

app.get('/api/teams/:teamId/proposals', (req, res) => {
  let filtered = [...proposals];

  const { status, author } = req.query;
  if (status) {
    filtered = filtered.filter(p => p.status === status);
  }
  if (author) {
    filtered = filtered.filter(p => p.author.id === author);
  }

  res.json(success(filtered));
});

app.get('/api/teams/:teamId/proposals/:id', (req, res) => {
  const proposal = proposals.find(p => p.id === req.params.id);
  if (!proposal) return res.status(404).json(error('PROPOSAL_NOT_FOUND', '제안을 찾을 수 없습니다.'));
  res.json(success(proposal));
});

app.post('/api/teams/:teamId/proposals', (req, res) => {
  const newProposal = {
    id: String(proposals.length + 1),
    ...req.body,
    author: users[0],
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  proposals.push(newProposal);
  res.status(201).json(success(newProposal));
});

app.post('/api/teams/:teamId/proposals/:id/review', (req, res) => {
  const proposal = proposals.find(p => p.id === req.params.id);
  if (!proposal) return res.status(404).json(error('PROPOSAL_NOT_FOUND', '제안을 찾을 수 없습니다.'));

  const { status, comment } = req.body;
  const reviewer = proposal.reviewers.find(r => r.user.id === users[0].id);
  if (reviewer) {
    reviewer.status = status;
    reviewer.comment = comment;
    reviewer.reviewedAt = new Date().toISOString();
  }

  // Check if all approved
  const allApproved = proposal.reviewers.every(r => r.status === 'approved');
  if (allApproved) {
    proposal.status = 'approved';
  }

  proposal.updatedAt = new Date().toISOString();
  res.json(success(proposal));
});

app.post('/api/teams/:teamId/proposals/:id/merge', (req, res) => {
  const proposal = proposals.find(p => p.id === req.params.id);
  if (!proposal) return res.status(404).json(error('PROPOSAL_NOT_FOUND', '제안을 찾을 수 없습니다.'));

  proposal.status = 'merged';
  proposal.updatedAt = new Date().toISOString();
  res.json(success(proposal));
});

// ============================================
// Marketplace
// ============================================

app.get('/api/marketplace/rules', (req, res) => {
  let filtered = [...marketplaceRules];

  const { category, tags: tagFilter, search, sort } = req.query;

  if (category && category !== 'all') {
    filtered = filtered.filter(r => r.category.startsWith(category));
  }
  if (tagFilter) {
    const tagList = tagFilter.split(',');
    filtered = filtered.filter(r => tagList.some(t => r.tags.includes(t)));
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  }
  if (sort) {
    filtered.sort((a, b) => {
      if (sort === 'popular') return b.likes - a.likes;
      if (sort === 'downloads') return b.downloads - a.downloads;
      if (sort === 'rating') return b.rating - a.rating;
      return 0;
    });
  }

  res.json(success(filtered));
});

app.get('/api/marketplace/rules/:id', (req, res) => {
  const rule = marketplaceRules.find(r => r.id === req.params.id);
  if (!rule) return res.status(404).json(error('RULE_NOT_FOUND', '규칙을 찾을 수 없습니다.'));
  res.json(success(rule));
});

app.get('/api/marketplace/collections', (req, res) => {
  res.json(success(collections));
});

app.get('/api/marketplace/collections/:id', (req, res) => {
  const collection = collections.find(c => c.id === req.params.id);
  if (!collection) return res.status(404).json(error('COLLECTION_NOT_FOUND', '컬렉션을 찾을 수 없습니다.'));
  res.json(success(collection));
});

app.get('/api/marketplace/trending', (req, res) => {
  const trending = [...marketplaceRules].sort((a, b) => b.likes - a.likes).slice(0, 5);
  res.json(success(trending));
});

app.get('/api/marketplace/categories', (req, res) => {
  res.json(success([
    { id: 'code', name: '코드', icon: 'code', count: 25 },
    { id: 'security', name: '보안', icon: 'shield', count: 12 },
    { id: 'workflow', name: '워크플로우', icon: 'git-branch', count: 8 },
    { id: 'testing', name: '테스팅', icon: 'test-tube', count: 6 },
    { id: 'devops', name: 'DevOps', icon: 'server', count: 5 },
    { id: 'docs', name: '문서', icon: 'file-text', count: 4 }
  ]));
});

// ============================================
// Analytics
// ============================================

app.get('/api/teams/:teamId/analytics/overview', (req, res) => {
  const period = parseInt(req.query.period) || 30;
  const data = analyticsData[period] || analyticsData[30];
  res.json(success(data));
});

app.get('/api/teams/:teamId/analytics/activity', (req, res) => {
  const { type, page = 1, limit = 10 } = req.query;
  let filtered = [...activities];

  if (type && type !== 'all') {
    filtered = filtered.filter(a => a.type === type);
  }

  const result = paginate(filtered, parseInt(page), parseInt(limit));
  res.json(success(result.data, result.pagination));
});

app.get('/api/teams/:teamId/analytics/contributors', (req, res) => {
  const { sort = 'points' } = req.query;
  const sorted = [...contributors].sort((a, b) => b[sort] - a[sort]);
  res.json(success(sorted));
});

app.get('/api/teams/:teamId/analytics/tags', (req, res) => {
  res.json(success(tags));
});

// ============================================
// Discussions
// ============================================

app.get('/api/teams/:teamId/rules/:ruleId/discussions', (req, res) => {
  const ruleDiscussions = discussions.filter(d => d.ruleId === req.params.ruleId);
  res.json(success(ruleDiscussions));
});

app.post('/api/teams/:teamId/rules/:ruleId/discussions', (req, res) => {
  const newDiscussion = {
    id: `d${discussions.length + 1}`,
    ruleId: req.params.ruleId,
    user: users[0],
    content: req.body.content,
    likes: 0,
    createdAt: new Date().toISOString(),
    replies: []
  };
  discussions.push(newDiscussion);
  res.status(201).json(success(newDiscussion));
});

app.post('/api/discussions/:id/replies', (req, res) => {
  const discussion = discussions.find(d => d.id === req.params.id);
  if (!discussion) return res.status(404).json(error('DISCUSSION_NOT_FOUND', '댓글을 찾을 수 없습니다.'));

  const reply = {
    id: `${discussion.id}r${discussion.replies.length + 1}`,
    user: users[0],
    content: req.body.content,
    likes: 0,
    createdAt: new Date().toISOString()
  };
  discussion.replies.push(reply);
  res.status(201).json(success(reply));
});

app.post('/api/discussions/:id/like', (req, res) => {
  const discussion = discussions.find(d => d.id === req.params.id);
  if (!discussion) return res.status(404).json(error('DISCUSSION_NOT_FOUND', '댓글을 찾을 수 없습니다.'));

  discussion.likes++;
  res.json(success({ likes: discussion.likes }));
});

// ============================================
// Notifications (Mock)
// ============================================

const notifications = [
  { id: '1', type: 'proposal_approved', message: '@jane이 당신의 react-hooks 제안을 승인했습니다', read: false, createdAt: '2025-01-19T10:00:00Z' },
  { id: '2', type: 'comment_added', message: '@bob이 댓글을 남겼습니다', read: false, createdAt: '2025-01-19T08:00:00Z' },
  { id: '3', type: 'review_requested', message: 'style-format 규칙 수정 제안에 대한 리뷰 요청', read: true, createdAt: '2025-01-17T00:00:00Z' }
];

app.get('/api/notifications', (req, res) => {
  res.json(success(notifications));
});

app.patch('/api/notifications/:id', (req, res) => {
  const notification = notifications.find(n => n.id === req.params.id);
  if (notification) {
    notification.read = true;
  }
  res.json(success(notification));
});

app.post('/api/notifications/read-all', (req, res) => {
  notifications.forEach(n => n.read = true);
  res.json(success({ readAll: true }));
});

// ============================================
// Insights (AI Analytics)
// ============================================

const insightsData = {
  healthScore: 78,
  metrics: {
    complianceRate: 87.5,
    complianceChange: 3.2,
    activeRules: 38,
    totalRules: 42,
    violations: 156,
    violationChange: -23,
    reviewTime: 42,
    reviewTimeChange: -18,
    bugsReduced: 31,
    autoFixed: 89
  },
  topViolations: [
    { rule: 'naming-variable-001', name: '변수명 규칙', count: 45, severity: 'warning', trend: 'down', trendValue: '-12%' },
    { rule: 'style-indent-001', name: '들여쓰기 규칙', count: 32, severity: 'warning', trend: 'up', trendValue: '+8%' },
    { rule: 'security-sql-001', name: 'SQL Injection 방지', count: 23, severity: 'error', trend: 'down', trendValue: '-5%' },
    { rule: 'api-error-001', name: 'API 에러 핸들링', count: 18, severity: 'warning', trend: 'neutral', trendValue: '0%' },
    { rule: 'comment-jsdoc-001', name: 'JSDoc 주석', count: 15, severity: 'info', trend: 'down', trendValue: '-20%' }
  ],
  recommendations: [
    { type: 'missing', priority: 'high', title: 'XSS 방지 규칙 추가', description: '보안 취약점 감지: 사용자 입력 검증 규칙이 없습니다', impact: '보안 위험 85% 감소 예상', source: 'AI 분석', adoptionRate: '92%' },
    { type: 'missing', priority: 'high', title: 'CSRF 토큰 검증', description: 'API 요청 시 CSRF 토큰 필수 검증', impact: '보안 위험 78% 감소', source: 'Security Team', adoptionRate: '88%' },
    { type: 'popular', priority: 'medium', title: 'React Hooks 규칙', description: '유사 팀 89%가 사용 중인 규칙입니다', impact: '코드 품질 12% 향상 예상', source: '벤치마크', adoptionRate: '89%' },
    { type: 'optimize', priority: 'low', title: '네이밍 규칙 최적화', description: '현재 규칙이 너무 엄격하여 위반이 많습니다', impact: '위반 40% 감소 예상', source: '패턴 분석', adoptionRate: '-' }
  ],
  actionItems: [
    { priority: 'high', title: '즉시 수정: SQL Injection 위험', description: 'security-sql-001 규칙 위반 23건 발견', action: '자동 수정 가능' },
    { priority: 'high', title: 'XSS 방지 규칙 추가', description: '보안 분석 결과 필수 규칙 누락 감지', action: '규칙 추가' },
    { priority: 'medium', title: '네이밍 규칙 검토', description: '위반율이 높아 규칙 조정 권장', action: '규칙 수정' },
    { priority: 'low', title: '미사용 규칙 정리', description: '4개 규칙이 3개월간 미사용', action: '비활성화 검토' }
  ],
  violations: {
    total: 156,
    bySevetiry: { error: 23, warning: 89, info: 44 },
    autoFixable: 67,
    hotspots: [
      { path: 'src/components', violations: 45 },
      { path: 'src/utils', violations: 32 },
      { path: 'src/api', violations: 28 },
      { path: 'src/hooks', violations: 15 },
      { path: 'src/pages', violations: 12 }
    ],
    hourlyPattern: [2, 1, 0, 0, 1, 3, 8, 15, 22, 28, 25, 20, 18, 35, 42, 38, 30, 25, 15, 8, 5, 3, 2, 1]
  },
  benchmarks: {
    industryAvg: { compliance: 82, coverage: 68, autoFix: 48 },
    teamRanking: [
      { name: 'Frontend Team', score: 87.5, rank: 1 },
      { name: 'Backend Team', score: 86.8, rank: 2 },
      { name: 'Design Team', score: 85.2, rank: 3 },
      { name: 'Mobile Team', score: 83.1, rank: 4 },
      { name: 'DevOps Team', score: 79.4, rank: 5 }
    ]
  },
  predictions: {
    nextMonthCompliance: 89.2,
    riskRules: 3,
    onboardingTime: 2.3,
    riskAlerts: [
      { severity: 'warning', title: 'style-indent-001 위반 증가 추세', description: '지난 2주간 위반이 35% 증가', prediction: '다음 주 50건 이상 예상' },
      { severity: 'info', title: '신규 팀원 온보딩 중', description: '2명의 신규 팀원이 적응 중', prediction: '2주 후 정상화 예상' },
      { severity: 'success', title: 'security-sql-001 개선 중', description: '보안 규칙 준수율이 꾸준히 개선', prediction: '4주 후 95% 달성 예상' }
    ]
  },
  trendData: {
    7: [82, 84, 83, 85, 86, 87, 87.5],
    30: [75, 77, 78, 80, 82, 83, 85, 84, 85, 86, 87, 87.5],
    90: [65, 68, 70, 72, 75, 77, 78, 80, 82, 83, 85, 87.5]
  }
};

app.get('/api/teams/:teamId/insights/overview', (req, res) => {
  res.json(success({
    healthScore: insightsData.healthScore,
    metrics: insightsData.metrics,
    topViolations: insightsData.topViolations.slice(0, 5),
    recommendations: insightsData.recommendations.slice(0, 3),
    actionItems: insightsData.actionItems
  }));
});

app.get('/api/teams/:teamId/insights/violations', (req, res) => {
  res.json(success(insightsData.violations));
});

app.get('/api/teams/:teamId/insights/recommendations', (req, res) => {
  const { type } = req.query;
  let filtered = insightsData.recommendations;
  if (type && type !== 'all') {
    filtered = filtered.filter(r => r.type === type);
  }
  res.json(success(filtered));
});

app.get('/api/teams/:teamId/insights/benchmarks', (req, res) => {
  res.json(success(insightsData.benchmarks));
});

app.get('/api/teams/:teamId/insights/predictions', (req, res) => {
  res.json(success(insightsData.predictions));
});

app.get('/api/teams/:teamId/insights/trends', (req, res) => {
  const period = parseInt(req.query.period) || 30;
  res.json(success({
    period,
    data: insightsData.trendData[period] || insightsData.trendData[30]
  }));
});

app.post('/api/teams/:teamId/insights/auto-fix', (req, res) => {
  res.json(success({
    fixed: 3,
    message: '3개의 위반 사항이 자동 수정되었습니다'
  }));
});

// ============================================
// Server Start
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Rulebook Mock API Server                             ║
║                                                           ║
║   Running at: http://localhost:${PORT}                     ║
║                                                           ║
║   Endpoints:                                              ║
║   • GET  /api/auth/me                                     ║
║   • GET  /api/teams                                       ║
║   • GET  /api/teams/:id/rules                             ║
║   • GET  /api/teams/:id/proposals                         ║
║   • GET  /api/marketplace/rules                           ║
║   • GET  /api/teams/:id/analytics/overview                ║
║   • GET  /api/notifications                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
