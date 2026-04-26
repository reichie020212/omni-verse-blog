import { test, expect } from '@playwright/test';
import { checkA11y } from './helpers';

test('topbar search → live filter → Enter navigates to /search', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox');
  await search.fill('lisbon');
  // live filter still on home page (SearchProvider reflects query in URL via replaceState → /?q=lisbon)
  await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/(?:\?.*)?$/);
  await search.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=lisbon$/);
  // at least one result
  await expect(page.locator('a[href^="/posts/"]').first()).toBeVisible();
  await checkA11y(page);
});
