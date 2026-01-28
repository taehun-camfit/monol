/**
 * Marketplace E2E Tests
 */

import { test, expect } from '@playwright/test';

// Mock marketplace data
const mockRules = [
  {
    id: 'rule-1',
    ruleId: 'naming-001',
    name: 'Variable Naming Convention',
    description: 'Best practices for naming variables',
    category: 'code/naming',
    tags: ['naming', 'style'],
    rating: 4.5,
    downloads: 1234,
    author: { name: 'Author 1' },
  },
  {
    id: 'rule-2',
    ruleId: 'style-001',
    name: 'Code Formatting Standards',
    description: 'Consistent code formatting rules',
    category: 'code/style',
    tags: ['formatting', 'prettier'],
    rating: 4.2,
    downloads: 987,
    author: { name: 'Author 2' },
  },
];

test.describe('Marketplace', () => {
  test.describe('Browse Rules', () => {
    test('should display marketplace rules', async ({ page }) => {
      await page.route('**/api/marketplace/rules**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            rules: mockRules,
            pagination: { total: 2, limit: 20, offset: 0 },
          }),
        });
      });

      await page.goto('/marketplace');
      await expect(page.getByText('Variable Naming Convention')).toBeVisible();
      await expect(page.getByText('Code Formatting Standards')).toBeVisible();
    });

    test('should filter rules by category', async ({ page }) => {
      await page.route('**/api/marketplace/rules**', async (route) => {
        const url = new URL(route.request().url());
        const category = url.searchParams.get('category');

        const filteredRules = category
          ? mockRules.filter((r) => r.category.startsWith(category))
          : mockRules;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            rules: filteredRules,
            pagination: { total: filteredRules.length, limit: 20, offset: 0 },
          }),
        });
      });

      await page.goto('/marketplace');
      // Click on category filter
      // Verify filtered results
    });

    test('should search rules', async ({ page }) => {
      await page.route('**/api/marketplace/rules**', async (route) => {
        const url = new URL(route.request().url());
        const query = url.searchParams.get('q');

        const searchedRules = query
          ? mockRules.filter(
              (r) =>
                r.name.toLowerCase().includes(query.toLowerCase()) ||
                r.description.toLowerCase().includes(query.toLowerCase())
            )
          : mockRules;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            rules: searchedRules,
            pagination: { total: searchedRules.length, limit: 20, offset: 0 },
          }),
        });
      });

      await page.goto('/marketplace');
      await page.getByPlaceholder(/search/i).fill('naming');
      await page.keyboard.press('Enter');

      // Verify search results
      await expect(page.getByText('Variable Naming Convention')).toBeVisible();
    });

    test('should sort rules by downloads', async ({ page }) => {
      await page.route('**/api/marketplace/rules**', async (route) => {
        const url = new URL(route.request().url());
        const sort = url.searchParams.get('sort');

        let sortedRules = [...mockRules];
        if (sort === 'downloads') {
          sortedRules.sort((a, b) => b.downloads - a.downloads);
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            rules: sortedRules,
            pagination: { total: sortedRules.length, limit: 20, offset: 0 },
          }),
        });
      });

      await page.goto('/marketplace');
      // Select sort by downloads
      // Verify order
    });
  });

  test.describe('Rule Detail', () => {
    test('should display rule details', async ({ page }) => {
      await page.route('**/api/marketplace/rules/rule-1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockRules[0],
            content: '# Rule Content\n\nDetailed rule description...',
            version: '1.0.0',
            _count: { adoptions: 100, reviews: 25 },
          }),
        });
      });

      await page.goto('/marketplace/rule-1');
      await expect(page.getByText('Variable Naming Convention')).toBeVisible();
      await expect(page.getByText('naming-001')).toBeVisible();
    });

    test('should display rule reviews', async ({ page }) => {
      await page.route('**/api/marketplace/rules/rule-1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockRules[0],
            reviews: [
              { id: 'r1', rating: 5, content: 'Great rule!' },
              { id: 'r2', rating: 4, content: 'Very useful' },
            ],
          }),
        });
      });

      await page.goto('/marketplace/rule-1');
      await expect(page.getByText('Great rule!')).toBeVisible();
    });

    test('should show similar rules', async ({ page }) => {
      await page.route('**/api/marketplace/rules/rule-1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockRules[0],
            similarRules: [mockRules[1]],
          }),
        });
      });

      await page.goto('/marketplace/rule-1');
      // Verify similar rules section
    });
  });

  test.describe('Adopt Rule', () => {
    test('should adopt a rule', async ({ page }) => {
      // Setup auth
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 'user-1', name: 'Test User' },
          }),
        });
      });

      await page.route('**/api/marketplace/rules/rule-1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockRules[0]),
        });
      });

      await page.route('**/api/marketplace/rules/rule-1/adopt', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'adoption-1', ruleId: 'rule-1' }),
        });
      });

      await page.goto('/marketplace/rule-1');
      await page.getByRole('button', { name: /adopt/i }).click();

      // Verify success message
    });
  });

  test.describe('Trending Rules', () => {
    test('should display trending rules', async ({ page }) => {
      await page.route('**/api/marketplace/trending', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ rules: mockRules }),
        });
      });

      await page.goto('/marketplace');
      // Verify trending section is visible
    });
  });

  test.describe('Categories', () => {
    test('should display categories', async ({ page }) => {
      await page.route('**/api/marketplace/categories', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            categories: [
              { name: 'code/naming', count: 15 },
              { name: 'code/style', count: 12 },
              { name: 'security', count: 8 },
            ],
          }),
        });
      });

      await page.goto('/marketplace');
      // Verify categories are displayed
    });
  });

  test.describe('Favorites', () => {
    test('should add rule to favorites', async ({ page }) => {
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: { id: 'user-1' } }),
        });
      });

      await page.route('**/api/favorites/rules/rule-1', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'fav-1' }),
          });
        }
      });

      await page.goto('/marketplace/rule-1');
      // Click favorite button
      // Verify favorite state changes
    });
  });

  test.describe('Reviews', () => {
    test('should submit a review', async ({ page }) => {
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: { id: 'user-1' } }),
        });
      });

      await page.route('**/api/reviews/rule/rule-1', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'review-new',
              rating: 5,
              content: 'Great rule!',
            }),
          });
        }
      });

      await page.goto('/marketplace/rule-1');
      // Fill review form
      // Submit
      // Verify review is added
    });
  });
});
