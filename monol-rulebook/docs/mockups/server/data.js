// Mock Data for Rulebook Console API

export const users = [
  { id: '1', name: 'Kent', email: 'kent@example.com', avatar: null, initial: 'K', color: 'green', role: 'admin' },
  { id: '2', name: 'Jason', email: 'jason@example.com', avatar: null, initial: 'J', color: 'blue', role: 'member' },
  { id: '3', name: 'Mike', email: 'mike@example.com', avatar: null, initial: 'M', color: 'purple', role: 'member' },
  { id: '4', name: 'Sarah', email: 'sarah@example.com', avatar: null, initial: 'S', color: 'pink', role: 'member' },
  { id: '5', name: 'Alex', email: 'alex@example.com', avatar: null, initial: 'A', color: 'cyan', role: 'member' },
];

export const teams = [
  { id: '1', name: 'Frontend Team', description: '프론트엔드 개발팀', memberCount: 8, ruleCount: 42 },
  { id: '2', name: 'Backend Team', description: '백엔드 개발팀', memberCount: 6, ruleCount: 35 },
  { id: '3', name: 'DevOps Team', description: '데브옵스팀', memberCount: 4, ruleCount: 28 },
];

export const rules = [
  {
    id: '1',
    ruleId: 'naming-variable-001',
    name: '변수명 규칙',
    description: '변수명, 함수명, 클래스명에 대한 네이밍 컨벤션입니다.',
    category: 'code/naming',
    severity: 'warning',
    tags: ['naming', 'variables', 'style'],
    content: `변수명, 함수명, 클래스명에 대한 네이밍 컨벤션입니다.

- 변수/함수: camelCase
- 클래스/타입: PascalCase
- 상수: SCREAMING_SNAKE_CASE
- 파일명: kebab-case`,
    examples: {
      good: [
        "const userName = 'kent';",
        "function getUserById(id: string) { }",
        "class UserService { }",
        "const MAX_RETRY_COUNT = 3;"
      ],
      bad: [
        "const user_name = 'kent';",
        "function GetUserById(id) { }",
        "class user_service { }",
        "const maxRetryCount = 3; // 상수는 SCREAMING_CASE"
      ]
    },
    exceptions: ['외부 API 응답 객체의 snake_case 필드', '레거시 코드와의 호환성이 필요한 경우'],
    author: users[0],
    version: '1.2.0',
    status: 'active',
    adoptionRate: 89,
    likes: 12,
    comments: 3,
    teamId: '1',
    createdAt: '2025-01-10T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z'
  },
  {
    id: '2',
    ruleId: 'git-commit-001',
    name: '커밋 메시지 규칙',
    description: 'Conventional Commits 형식을 따르는 커밋 메시지 규칙입니다.',
    category: 'workflow/git',
    severity: 'error',
    tags: ['git', 'commit', 'workflow'],
    content: `Conventional Commits 형식을 따르는 커밋 메시지 규칙입니다.

형식: <type>(<scope>): <subject>

타입:
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 변경
- style: 코드 스타일 (포맷팅)
- refactor: 리팩토링
- test: 테스트 추가/수정
- chore: 빌드, 설정 변경`,
    examples: {
      good: [
        "feat(auth): add social login support",
        "fix(api): resolve timeout issue in user endpoint",
        "docs(readme): update installation guide"
      ],
      bad: [
        "fixed bug",
        "WIP",
        "asdf",
        "Update user.ts"
      ]
    },
    exceptions: ['머지 커밋 (자동 생성)', '리버트 커밋'],
    author: users[0],
    version: '2.0.0',
    status: 'active',
    adoptionRate: 95,
    likes: 24,
    comments: 8,
    teamId: '1',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-18T00:00:00Z'
  },
  {
    id: '3',
    ruleId: 'style-format-001',
    name: '코드 포맷팅 규칙',
    description: '일관된 코드 포맷팅을 유지하기 위한 규칙입니다.',
    category: 'code/style',
    severity: 'warning',
    tags: ['style', 'formatting', 'prettier'],
    content: `일관된 코드 포맷팅을 유지하기 위한 규칙입니다.
Prettier 설정을 따르며, 들여쓰기는 2칸 스페이스를 사용합니다.`,
    examples: {
      good: [
        `function greet(name: string) {
  return \`Hello, \${name}!\`;
}`,
        `const config = {
  indent: 2,
  semi: true,
};`
      ],
      bad: [
        `function greet(name:string){
return \`Hello, \${name}!\`
}`,
        `const config = {indent: 2,semi: true}`
      ]
    },
    exceptions: ['자동 생성된 코드 (*.generated.ts)', '벤더 라이브러리'],
    author: users[1],
    version: '1.0.0',
    status: 'active',
    adoptionRate: 92,
    likes: 18,
    comments: 5,
    teamId: '1',
    createdAt: '2025-01-08T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: '4',
    ruleId: 'error-handling-001',
    name: 'API 에러 핸들링 규칙',
    description: 'API 에러를 일관되게 처리하기 위한 규칙입니다.',
    category: 'code/error',
    severity: 'error',
    tags: ['error-handling', 'api', 'exceptions'],
    content: `API 에러를 일관되게 처리하기 위한 규칙입니다.

모든 API 에러는 표준 에러 응답 형식을 따라야 합니다.`,
    examples: {
      good: [
        `try {
  const data = await fetchUser(id);
} catch (error) {
  logger.error('Failed to fetch user', { userId: id, error });
  throw new ApiError('USER_FETCH_FAILED', error);
}`
      ],
      bad: [
        `const data = await fetchUser(id); // 에러 핸들링 없음`,
        `try {
  const data = await fetchUser(id);
} catch (e) {
  console.log(e); // 로깅 부족
}`
      ]
    },
    author: users[2],
    version: '1.1.0',
    status: 'active',
    adoptionRate: 78,
    likes: 15,
    comments: 6,
    teamId: '1',
    createdAt: '2025-01-12T00:00:00Z',
    updatedAt: '2025-01-17T00:00:00Z'
  },
  {
    id: '5',
    ruleId: 'react-hooks-001',
    name: 'React Hooks 사용 규칙',
    description: 'React Hooks 사용 시 지켜야 할 규칙입니다.',
    category: 'code/react',
    severity: 'warning',
    tags: ['react', 'hooks', 'state'],
    content: `React Hooks 사용 시 지켜야 할 규칙입니다.

1. 컴포넌트 최상위에서만 Hook 호출
2. React 함수 내에서만 Hook 호출
3. 커스텀 Hook은 use로 시작`,
    examples: {
      good: [
        `function useCustomHook() {
  const [state, setState] = useState(null);
  useEffect(() => { ... }, []);
  return state;
}`
      ],
      bad: [
        `function Component() {
  if (condition) {
    useState(null); // 조건문 안에서 Hook
  }
}`
      ]
    },
    author: users[0],
    version: '1.0.0',
    status: 'draft',
    adoptionRate: 0,
    likes: 5,
    comments: 2,
    teamId: '1',
    createdAt: '2025-01-18T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z'
  }
];

export const proposals = [
  {
    id: '1',
    type: 'update',
    rule: rules[3], // error-handling-001
    title: 'API 에러 핸들링 규칙 강화',
    changes: {
      description: '에러 핸들링 규칙에 재시도 로직 추가',
      content: '기존 내용 + 재시도 로직 가이드'
    },
    author: users[1],
    reviewers: [
      { user: users[0], status: 'approved', comment: '좋은 제안입니다. 에러 핸들링 일관성은 매우 중요하죠.', reviewedAt: '2025-01-19T10:00:00Z' },
      { user: users[2], status: 'pending', comment: null, reviewedAt: null }
    ],
    status: 'pending',
    message: '에러 핸들링 시 재시도 로직이 필요한 경우가 많아서 가이드를 추가했습니다.',
    createdAt: '2025-01-17T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z'
  },
  {
    id: '2',
    type: 'create',
    rule: rules[4], // react-hooks-001
    title: 'React Hooks 사용 규칙 추가',
    author: users[0],
    reviewers: [
      { user: users[1], status: 'approved', comment: 'LGTM!', reviewedAt: '2025-01-19T08:00:00Z' },
      { user: users[3], status: 'pending', comment: null, reviewedAt: null }
    ],
    status: 'pending',
    message: 'React Hooks 관련 버그가 자주 발생해서 팀 전체 규칙으로 추가하면 좋겠습니다.',
    createdAt: '2025-01-18T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z'
  },
  {
    id: '3',
    type: 'update',
    rule: rules[0], // naming-variable-001
    title: 'React 컴포넌트 파일명 예외 추가',
    author: users[3],
    reviewers: [
      { user: users[0], status: 'approved', comment: '예외 케이스 추가 동의합니다.', reviewedAt: '2025-01-18T14:00:00Z' },
      { user: users[1], status: 'approved', comment: 'LGTM', reviewedAt: '2025-01-18T16:00:00Z' }
    ],
    status: 'approved',
    message: 'React 컴포넌트 파일명은 PascalCase가 더 일반적이므로 예외로 추가하면 좋겠습니다.',
    createdAt: '2025-01-16T00:00:00Z',
    updatedAt: '2025-01-18T00:00:00Z'
  }
];

export const marketplaceRules = [
  {
    id: 'm1',
    ruleId: 'api-error-handling-001',
    name: 'API 에러 핸들링 규칙',
    description: 'RESTful API 에러를 일관되게 처리하기 위한 표준 규칙입니다.',
    category: 'code/error',
    severity: 'error',
    tags: ['api', 'error-handling', 'rest'],
    team: teams[1],
    likes: 156,
    downloads: 42,
    rating: 4.8,
    isNew: false
  },
  {
    id: 'm2',
    ruleId: 'docker-best-practices-001',
    name: 'Docker 베스트 프랙티스',
    description: 'Docker 컨테이너 구성 시 지켜야 할 베스트 프랙티스입니다.',
    category: 'devops/docker',
    severity: 'warning',
    tags: ['docker', 'devops', 'container'],
    team: teams[2],
    likes: 98,
    downloads: 28,
    rating: 4.6,
    isNew: false
  },
  {
    id: 'm3',
    ruleId: 'sql-injection-001',
    name: 'SQL Injection 방지 규칙',
    description: 'SQL Injection 공격을 방지하기 위한 보안 규칙입니다.',
    category: 'security/database',
    severity: 'error',
    tags: ['security', 'sql', 'injection'],
    team: teams[1],
    likes: 234,
    downloads: 89,
    rating: 4.9,
    isNew: false
  },
  {
    id: 'm4',
    ruleId: 'typescript-strict-001',
    name: 'TypeScript 엄격 모드 규칙',
    description: 'TypeScript strict 모드 설정 및 타입 안전성 규칙입니다.',
    category: 'code/typescript',
    severity: 'warning',
    tags: ['typescript', 'strict', 'type-safety'],
    team: teams[0],
    likes: 67,
    downloads: 23,
    rating: 4.5,
    isNew: true
  },
  {
    id: 'm5',
    ruleId: 'accessibility-001',
    name: '접근성 체크리스트',
    description: '웹 접근성을 보장하기 위한 체크리스트입니다.',
    category: 'code/accessibility',
    severity: 'warning',
    tags: ['accessibility', 'a11y', 'wcag'],
    team: teams[0],
    likes: 45,
    downloads: 15,
    rating: 4.7,
    isNew: true
  }
];

export const collections = [
  {
    id: 'c1',
    name: 'React Best Practices',
    description: 'React 개발에 필요한 필수 규칙 모음',
    author: teams[0],
    rules: 12,
    downloads: 156,
    tags: ['react', 'frontend', 'hooks']
  },
  {
    id: 'c2',
    name: 'Security Essentials',
    description: '보안을 위한 필수 규칙 컬렉션',
    author: teams[1],
    rules: 8,
    downloads: 234,
    tags: ['security', 'xss', 'injection']
  },
  {
    id: 'c3',
    name: 'TypeScript Starter',
    description: 'TypeScript 프로젝트 시작을 위한 규칙',
    author: teams[0],
    rules: 6,
    downloads: 89,
    tags: ['typescript', 'types', 'strict']
  }
];

export const activities = [
  { id: '1', user: users[0], type: 'approve', target: { type: 'proposal', id: '1', name: 'API 에러 핸들링 규칙 강화' }, detail: '좋은 제안입니다. 에러 핸들링 일관성은 매우 중요하죠.', createdAt: '2025-01-19T10:50:00Z' },
  { id: '2', user: users[1], type: 'create', target: { type: 'proposal', id: '1', name: 'API 에러 핸들링 규칙 강화' }, createdAt: '2025-01-19T08:00:00Z' },
  { id: '3', user: users[2], type: 'adopt', target: { type: 'rule', id: 'm3', name: 'SQL Injection 방지 규칙' }, createdAt: '2025-01-18T00:00:00Z' },
  { id: '4', user: users[3], type: 'create', target: { type: 'rule', id: '5', name: '접근성 체크리스트' }, createdAt: '2025-01-17T00:00:00Z' },
  { id: '5', user: users[4], type: 'approve', target: { type: 'proposal', id: '3', name: 'React 컴포넌트 파일명 예외 추가' }, createdAt: '2025-01-16T00:00:00Z' },
  { id: '6', user: users[0], type: 'create', target: { type: 'rule', id: '2', name: '로깅 형식 표준화' }, createdAt: '2025-01-15T00:00:00Z' },
  { id: '7', user: users[1], type: 'adopt', target: { type: 'collection', id: 'c1', name: 'React Best Practices' }, createdAt: '2025-01-14T00:00:00Z' },
  { id: '8', user: users[2], type: 'approve', target: { type: 'proposal', id: '2', name: '변수명 규칙 수정' }, createdAt: '2025-01-13T00:00:00Z' },
];

export const discussions = [
  {
    id: 'd1',
    ruleId: '1',
    user: users[1],
    content: 'React 컴포넌트 파일명도 kebab-case인가요? PascalCase가 더 일반적인 것 같은데...',
    likes: 5,
    createdAt: '2025-01-17T00:00:00Z',
    replies: [
      {
        id: 'd1r1',
        user: users[0],
        content: '컴포넌트 파일은 예외로 추가할게요! PascalCase가 맞습니다.',
        likes: 3,
        createdAt: '2025-01-17T02:00:00Z'
      }
    ]
  },
  {
    id: 'd2',
    ruleId: '1',
    user: users[2],
    content: '환경 변수명은 SCREAMING_SNAKE_CASE 맞나요?',
    likes: 2,
    createdAt: '2025-01-15T00:00:00Z',
    replies: []
  }
];

export const contributors = [
  { user: users[0], rules: 15, reviews: 23, points: 152 },
  { user: users[1], rules: 12, reviews: 18, points: 128 },
  { user: users[2], rules: 8, reviews: 15, points: 95 },
  { user: users[3], rules: 6, reviews: 12, points: 72 },
  { user: users[4], rules: 4, reviews: 8, points: 48 },
];

export const analyticsData = {
  7: {
    stats: { totalRules: 42, totalChange: '+3%', activeRules: 38, activeChange: '+2%', pendingProposals: 3, contributors: 8, contributorsChange: '+1' },
    severity: { error: 12, warning: 22, info: 8 },
    categories: [
      { name: 'Code Style', count: 15 },
      { name: 'Security', count: 10 },
      { name: 'Performance', count: 8 },
      { name: 'Testing', count: 6 },
      { name: '기타', count: 3 }
    ],
    weeklyActivity: [
      { day: '월', create: 5, approve: 3, adopt: 2 },
      { day: '화', create: 8, approve: 4, adopt: 1 },
      { day: '수', create: 3, approve: 2, adopt: 3 },
      { day: '목', create: 9, approve: 6, adopt: 2 },
      { day: '금', create: 6, approve: 4, adopt: 4 },
      { day: '토', create: 2, approve: 1, adopt: 0 },
      { day: '일', create: 1, approve: 0, adopt: 1 }
    ]
  },
  30: {
    stats: { totalRules: 42, totalChange: '+12%', activeRules: 38, activeChange: '+5%', pendingProposals: 3, contributors: 8, contributorsChange: '+2' },
    severity: { error: 12, warning: 22, info: 8 },
    categories: [
      { name: 'Code Style', count: 15 },
      { name: 'Security', count: 10 },
      { name: 'Performance', count: 8 },
      { name: 'Testing', count: 6 },
      { name: '기타', count: 3 }
    ],
    weeklyActivity: [
      { day: '월', create: 12, approve: 8, adopt: 5 },
      { day: '화', create: 18, approve: 10, adopt: 4 },
      { day: '수', create: 8, approve: 6, adopt: 7 },
      { day: '목', create: 22, approve: 15, adopt: 6 },
      { day: '금', create: 15, approve: 9, adopt: 8 },
      { day: '토', create: 5, approve: 2, adopt: 1 },
      { day: '일', create: 3, approve: 1, adopt: 2 }
    ]
  },
  90: {
    stats: { totalRules: 42, totalChange: '+28%', activeRules: 38, activeChange: '+15%', pendingProposals: 3, contributors: 8, contributorsChange: '+4' },
    severity: { error: 12, warning: 22, info: 8 },
    categories: [
      { name: 'Code Style', count: 15 },
      { name: 'Security', count: 10 },
      { name: 'Performance', count: 8 },
      { name: 'Testing', count: 6 },
      { name: '기타', count: 3 }
    ],
    weeklyActivity: [
      { day: '월', create: 35, approve: 22, adopt: 12 },
      { day: '화', create: 48, approve: 28, adopt: 15 },
      { day: '수', create: 25, approve: 18, adopt: 20 },
      { day: '목', create: 55, approve: 38, adopt: 18 },
      { day: '금', create: 42, approve: 25, adopt: 22 },
      { day: '토', create: 12, approve: 5, adopt: 3 },
      { day: '일', create: 8, approve: 3, adopt: 5 }
    ]
  }
};

export const tags = [
  { name: 'naming', count: 18 },
  { name: 'style', count: 15 },
  { name: 'security', count: 14 },
  { name: 'error-handling', count: 10 },
  { name: 'api', count: 9 },
  { name: 'testing', count: 8 },
  { name: 'react', count: 7 },
  { name: 'typescript', count: 6 },
  { name: 'performance', count: 5 },
  { name: 'docs', count: 4 }
];
