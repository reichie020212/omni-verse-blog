import { test, expect } from '@playwright/test';
import { checkA11y } from './helpers';

test('clicking a card opens the drawer; Escape closes it', async ({ page }) => {
  await page.goto('/');
  const firstCard = page.locator('a[href^="/posts/"]').first();
  const href = await firstCard.getAttribute('href');
  await firstCard.click();
  await expect(page).toHaveURL(href!);
  const drawer = page.locator('dialog.post-drawer[open]');
  await expect(drawer).toBeVisible();
  await checkA11y(page);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});
