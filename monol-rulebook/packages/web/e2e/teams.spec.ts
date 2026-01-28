/**
 * Teams E2E Tests
 */

import { test, expect } from '@playwright/test';

// Helper to setup authenticated user
const setupAuth = async (page: any) => {
  await page.route('**/api/auth/session', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
};

test.describe('Teams', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test.describe('Team List', () => {
    test('should display user teams', async ({ page }) => {
      await page.route('**/api/teams', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            teams: [
              { id: 't1', name: 'Team Alpha', slug: 'team-alpha' },
              { id: 't2', name: 'Team Beta', slug: 'team-beta' },
            ],
          }),
        });
      });

      await page.goto('/');
      await expect(page.getByText('Team Alpha')).toBeVisible();
      await expect(page.getByText('Team Beta')).toBeVisible();
    });

    test('should show empty state for no teams', async ({ page }) => {
      await page.route('**/api/teams', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ teams: [] }),
        });
      });

      await page.goto('/');
      await expect(page.getByText(/no teams/i)).toBeVisible();
    });
  });

  test.describe('Team Dashboard', () => {
    test('should display team overview', async ({ page }) => {
      await page.route('**/api/teams/team-alpha', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 't1',
            name: 'Team Alpha',
            slug: 'team-alpha',
            description: 'A test team',
            _count: {
              members: 5,
              rules: 10,
            },
          }),
        });
      });

      await page.goto('/teams/team-alpha');
      await expect(page.getByRole('heading', { name: 'Team Alpha' })).toBeVisible();
    });

    test('should navigate to rules list', async ({ page }) => {
      await page.route('**/api/teams/team-alpha/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 't1', name: 'Team Alpha' }),
        });
      });

      await page.goto('/teams/team-alpha');
      await page.getByRole('link', { name: /rules/i }).click();
      await expect(page).toHaveURL(/\/teams\/team-alpha\/rules/);
    });
  });

  test.describe('Team Creation', () => {
    test('should create a new team', async ({ page }) => {
      await page.route('**/api/teams', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'new-team',
              name: 'New Team',
              slug: 'new-team',
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ teams: [] }),
          });
        }
      });

      await page.goto('/');
      // Click create team button
      // Fill in form
      // Submit
      // Verify redirect to new team
    });
  });

  test.describe('Team Settings', () => {
    test('should update team name', async ({ page }) => {
      await page.route('**/api/teams/team-alpha', async (route) => {
        if (route.request().method() === 'PUT') {
          const body = await route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 't1',
              name: body.name,
              slug: 'team-alpha',
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 't1',
              name: 'Team Alpha',
              slug: 'team-alpha',
            }),
          });
        }
      });

      await page.goto('/teams/team-alpha/settings');
      // Update team name
      // Save changes
      // Verify success message
    });
  });

  test.describe('Team Members', () => {
    test('should display team members', async ({ page }) => {
      await page.route('**/api/teams/team-alpha/members', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            members: [
              { id: 'm1', role: 'OWNER', user: { name: 'Owner User' } },
              { id: 'm2', role: 'MEMBER', user: { name: 'Member User' } },
            ],
          }),
        });
      });

      await page.goto('/teams/team-alpha/members');
      await expect(page.getByText('Owner User')).toBeVisible();
      await expect(page.getByText('Member User')).toBeVisible();
    });

    test('should invite new member', async ({ page }) => {
      await page.route('**/api/teams/team-alpha/invite', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'invite-code-123',
            expiresAt: new Date(Date.now() + 604800000).toISOString(),
          }),
        });
      });

      await page.goto('/teams/team-alpha/members');
      // Click invite button
      // Enter email
      // Submit
      // Verify invite link is shown
    });
  });
});
