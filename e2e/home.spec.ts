import { test, expect } from '@playwright/test';
import { checkA11y } from './helpers';

test('home renders hero, grid, and sidebar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  // Sidebar nav (the page has multiple <nav>; pick the Categories one)
  await expect(page.getByRole('navigation', { name: 'Categories' })).toBeVisible();
  // At least one post card visible
  const cards = page.locator('.post-card, .card-grid a');
  await expect(cards.first()).toBeVisible();
  await checkA11y(page);
});
