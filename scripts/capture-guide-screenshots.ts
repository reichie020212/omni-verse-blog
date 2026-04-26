/**
 * Captures the screenshots used in docs/guide/reader.md and author.md.
 *
 * Prereqs: a production build is running on http://localhost:3000 with
 *          DATABASE_URL=file:e2e.db and E2E_TEST=1 (so the test Credentials
 *          provider is available for the signed-in shots).
 *
 * Usage:
 *   rm -f e2e.db
 *   DATABASE_URL=file:e2e.db pnpm db:migrate
 *   pnpm build
 *   DATABASE_URL=file:e2e.db E2E_TEST=1 AUTH_TRUST_HOST=true pnpm start &
 *   sleep 5
 *   pnpm tsx scripts/capture-guide-screenshots.ts
 *   kill %1
 */
import { chromium } from '@playwright/test';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const OUT = path.join(process.cwd(), 'docs', 'guide', 'screenshots');
const BASE = 'http://localhost:3000';
const VIEWPORT = { width: 1280, height: 800 };

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  const shot = (name: string) => page.screenshot({ path: path.join(OUT, name) });

  // 01. Home (light) — magazine grid + sidebar
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await shot('01-home-light.png');
  console.log('✓ 01-home-light');

  // 02. Live search filter on home
  await page.getByRole('searchbox').fill('lisbon');
  await page.waitForTimeout(400);
  await shot('02-search-live.png');
  console.log('✓ 02-search-live');

  // 03. Press Enter → /search results page
  await page.getByRole('searchbox').press('Enter');
  await page.waitForURL(/\/search/);
  await page.waitForLoadState('networkidle');
  await shot('03-search-results.png');
  console.log('✓ 03-search-results');

  // 04. Click a card on home → drawer opens
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await page.locator('a[href^="/posts/"]').first().click();
  await page.waitForTimeout(700); // drawer animation
  await shot('04-drawer-open.png');
  console.log('✓ 04-drawer-open');

  // 05. Direct full post page
  await page.goto(`${BASE}/posts/a-week-in-lisbon-mostly-by-foot`);
  await page.waitForLoadState('networkidle');
  await shot('05-post-page.png');
  console.log('✓ 05-post-page');

  // 06. Sign-in page
  await page.goto(`${BASE}/signin`);
  await page.waitForLoadState('networkidle');
  await shot('06-signin.png');
  console.log('✓ 06-signin');

  // Sign in via the gated test Credentials provider so we can capture the
  // signed-in flows that follow.
  await page.getByTestId('e2e-signin').click();
  await page.waitForURL(/^(?!.*\/signin).*$/, { timeout: 10_000 });

  // Bookmark a post first (so /bookmarks isn't empty).
  await page.goto(`${BASE}/posts/a-week-in-lisbon-mostly-by-foot`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /bookmark this post/i }).click();
  await page.waitForTimeout(400);

  // 07. /bookmarks page with one bookmark
  await page.goto(`${BASE}/bookmarks`);
  await page.waitForLoadState('networkidle');
  await shot('07-bookmarks.png');
  console.log('✓ 07-bookmarks');

  // 08. Comment form (signed-in, typed-in)
  await page.goto(`${BASE}/posts/a-week-in-lisbon-mostly-by-foot`);
  await page.waitForLoadState('networkidle');
  const textarea = page.getByRole('textbox', { name: /your comment/i });
  await textarea.scrollIntoViewIfNeeded();
  await textarea.fill('Loved this — adding to my list for next year. *Pastéis*, here I come.');
  await page.waitForTimeout(200);
  await shot('08-comment-form.png');
  console.log('✓ 08-comment-form');

  // 09. Posted comment in list
  await page.getByRole('button', { name: /^post$/i }).click();
  await page.waitForTimeout(800);
  await page.locator('.comment, [data-testid="comment"], li').filter({ hasText: 'Loved this' }).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(200);
  await shot('09-comment-posted.png');
  console.log('✓ 09-comment-posted');

  // 10. Home in dark theme
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /switch to dark theme/i }).click();
  await page.waitForTimeout(300);
  await shot('10-home-dark.png');
  console.log('✓ 10-home-dark');

  await browser.close();
  console.log(`✓ all screenshots written to ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
