import { test, expect } from '@playwright/test';
import { signInAsE2E } from './helpers';

test('anon bookmark → sign in → merges into DB → /bookmarks lists it', async ({ page }) => {
  // Anon flow: bookmark a post via UI
  await page.goto('/');
  const firstPostLink = page.locator('a[href^="/posts/"]').first();
  const slug = (await firstPostLink.getAttribute('href'))!.replace('/posts/', '');
  await firstPostLink.click();
  await page.getByRole('button', { name: /bookmark this post/i }).click();

  // Confirm anon flow persisted to localStorage
  const stored = await page.evaluate(() => window.localStorage.getItem('ovb-bookmarks'));
  expect(stored).toContain(slug);

  // Sign in
  await signInAsE2E(page);

  // BookmarkSyncBootstrap merges localStorage → DB on first authenticated render
  // and clears localStorage. Visit /bookmarks (auth-gated; forces another render
  // with the session settled) and assert the bookmark appears.
  await page.goto('/bookmarks');
  await expect(
    page.locator('a[href$="/posts/' + slug + '"]').first(),
  ).toBeVisible({ timeout: 10_000 });
});
