/**
 * NextAuth Configuration
 */

import type { NextAuthOptions, User as NextAuthUser, Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import { api } from './api/client';
import type { LoginResponse } from './api/types';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    accessToken: string;
    refreshToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    accessToken: string;
    refreshToken: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // GitHub OAuth
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),

    // Email/Password credentials
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await api.post<LoginResponse>('/auth/login', {
            email: credentials.email,
            password: credentials.password,
          });

          return {
            id: response.user.id,
            email: response.user.email,
            username: response.user.username,
            displayName: response.user.displayName,
            avatarUrl: response.user.avatarUrl,
            accessToken: response.token.accessToken,
            refreshToken: response.token.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email || '';
        token.username = user.username;
        token.displayName = user.displayName;
        token.avatarUrl = user.avatarUrl;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }

      // If GitHub OAuth, we need to exchange the token
      if (account?.provider === 'github' && account.access_token) {
        // Exchange GitHub token for our API token
        try {
          const response = await api.post<LoginResponse>('/auth/github/callback', {
            code: account.access_token,
          });
          token.id = response.user.id;
          token.username = response.user.username;
          token.displayName = response.user.displayName;
          token.avatarUrl = response.user.avatarUrl;
          token.accessToken = response.token.accessToken;
          token.refreshToken = response.token.refreshToken;
        } catch {
          // Fall back to basic info from GitHub
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        username: token.username,
        displayName: token.displayName,
        avatarUrl: token.avatarUrl,
      };
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;

      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
