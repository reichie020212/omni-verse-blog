import { test, expect } from '@playwright/test';

test('category click filters the grid', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Tech' }).first().click();
  await expect(page).toHaveURL(/\/category\/tech$/);
  // At least one card visible after filter
  const cards = page.locator('a[href^="/posts/"]');
  await expect(cards.first()).toBeVisible();
});
