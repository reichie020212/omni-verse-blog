import { test, expect } from '@playwright/test';
import { signInAsE2E } from './helpers';

test('signed-in user adds a comment, sees it, deletes it', async ({ page }) => {
  await signInAsE2E(page);

  // Visit a known post
  await page.goto('/posts/a-week-in-lisbon-mostly-by-foot');

  const body = `e2e-comment-${Date.now()}`;
  const textarea = page.getByRole('textbox', { name: /your comment/i });
  await textarea.fill(body);
  await page.getByRole('button', { name: /^post$/i }).click();

  // Comment visible
  const comment = page.getByText(body);
  await expect(comment).toBeVisible({ timeout: 5_000 });

  // Delete the comment (DeleteCommentButton triggers confirm dialog)
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /delete comment/i }).first().click();
  await expect(comment).toBeHidden({ timeout: 5_000 });
});
