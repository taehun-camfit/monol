/**
 * GitHub API Client
 *
 * Handles GitHub API interactions including OAuth, App installations,
 * and repository operations.
 */

import { logger } from '../../utils/logger.js';

// GitHub API base URL
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

/**
 * GitHub API response types
 */
export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubUser;
  default_branch: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  merged: boolean;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  user: GitHubUser;
}

export interface GitHubComment {
  id: number;
  body: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
  content?: string; // Base64 encoded
}

/**
 * GitHub App Installation Token
 */
export interface GitHubInstallationToken {
  token: string;
  expiresAt: Date;
}

/**
 * GitHub API Client Class
 */
export class GitHubClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${GITHUB_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle rate limiting
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining && parseInt(remaining, 10) < 10) {
      logger.warn({ remaining }, 'GitHub API rate limit low');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new GitHubApiError(
        response.status,
        error.message || 'GitHub API error',
        error
      );
    }

    return response.json();
  }

  // ================================================================
  // User operations
  // ================================================================

  /**
   * Get authenticated user
   */
  async getCurrentUser(): Promise<GitHubUser> {
    return this.request<GitHubUser>('/user');
  }

  /**
   * Get user by username
   */
  async getUser(username: string): Promise<GitHubUser> {
    return this.request<GitHubUser>(`/users/${username}`);
  }

  // ================================================================
  // Repository operations
  // ================================================================

  /**
   * Get repository
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.request<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  /**
   * List user repositories
   */
  async listRepositories(
    options: { page?: number; per_page?: number } = {}
  ): Promise<GitHubRepository[]> {
    const params = new URLSearchParams({
      page: String(options.page || 1),
      per_page: String(options.per_page || 30),
    });
    return this.request<GitHubRepository[]>(`/user/repos?${params}`);
  }

  // ================================================================
  // File operations
  // ================================================================

  /**
   * Get file content
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<GitHubFile> {
    const params = ref ? `?ref=${ref}` : '';
    return this.request<GitHubFile>(
      `/repos/${owner}/${repo}/contents/${path}${params}`
    );
  }

  /**
   * Create or update file
   */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
    branch?: string
  ): Promise<{ content: GitHubFile; commit: { sha: string } }> {
    return this.request(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch,
      }),
    });
  }

  /**
   * Delete file
   */
  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch?: string
  ): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'DELETE',
      body: JSON.stringify({
        message,
        sha,
        branch,
      }),
    });
  }

  // ================================================================
  // Pull Request operations
  // ================================================================

  /**
   * Get pull request
   */
  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<GitHubPullRequest> {
    return this.request<GitHubPullRequest>(
      `/repos/${owner}/${repo}/pulls/${pullNumber}`
    );
  }

  /**
   * List pull request files
   */
  async listPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<Array<{ filename: string; status: string; patch?: string }>> {
    return this.request(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/files`
    );
  }

  /**
   * Create pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ): Promise<GitHubPullRequest> {
    return this.request(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({ title, head, base, body }),
    });
  }

  /**
   * Update pull request
   */
  async updatePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    updates: { title?: string; body?: string; state?: 'open' | 'closed' }
  ): Promise<GitHubPullRequest> {
    return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * List pull request comments
   */
  async listPullRequestComments(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<GitHubComment[]> {
    return this.request(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`
    );
  }

  /**
   * Create pull request comment
   */
  async createPullRequestComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string
  ): Promise<GitHubComment> {
    return this.request(
      `/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      }
    );
  }

  // ================================================================
  // Branch operations
  // ================================================================

  /**
   * Create branch
   */
  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    fromSha: string
  ): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: fromSha,
      }),
    });
  }

  /**
   * Get branch
   */
  async getBranch(
    owner: string,
    repo: string,
    branch: string
  ): Promise<{ name: string; commit: { sha: string } }> {
    return this.request(`/repos/${owner}/${repo}/branches/${branch}`);
  }
}

/**
 * GitHub OAuth Helper Functions
 */
export const githubOAuth = {
  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string, scopes: string[] = ['read:user', 'user:email']): string {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || '',
      redirect_uri: process.env.GITHUB_REDIRECT_URI || '',
      scope: scopes.join(' '),
      state,
    });
    return `${GITHUB_OAUTH_URL}/authorize?${params}`;
  },

  /**
   * Exchange code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    token_type: string;
    scope: string;
  }> {
    const response = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  },
};

/**
 * Custom GitHub API Error
 */
export class GitHubApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}
