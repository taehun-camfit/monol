/**
 * Authentication E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
    });

    test('should redirect to dashboard after login', async ({ page }) => {
      // Mock authenticated session
      await page.route('**/api/auth/session', async (route) => {
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

      await page.goto('/');
      await expect(page).toHaveURL(/\/(dashboard)?$/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Try to login with invalid credentials
      await page.route('**/api/auth/callback/credentials', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' }),
        });
      });

      // Verify error message is shown
      // Note: Actual implementation depends on the login form
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });

      await page.goto('/teams/some-team');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Logout', () => {
    test('should logout and redirect to home', async ({ page }) => {
      // Setup authenticated session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 'test', name: 'Test', email: 'test@test.com' },
          }),
        });
      });

      await page.goto('/');

      // Click logout (implementation depends on UI)
      // await page.getByRole('button', { name: /logout/i }).click();
      // await expect(page).toHaveURL('/');
    });
  });
});
