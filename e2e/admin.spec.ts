import { test, expect } from '@playwright/test';
import { signInAsE2E } from './helpers';

test('admin can create, edit, and delete a post via /admin/posts', async ({ page }) => {
  await signInAsE2E(page);

  await page.goto('/admin/posts');
  await expect(page.getByRole('heading', { name: 'Posts', level: 1 })).toBeVisible();

  await page.getByRole('link', { name: '+ New post' }).click();
  await expect(page).toHaveURL(/\/admin\/posts\/new$/);

  await page.locator('input[name="title"]').fill('E2E Test Post');
  await page.locator('input[name="slug"]').fill('e2e-test-post');
  await page.locator('textarea[name="excerpt"]').fill('A post created in an E2E test.');
  await page.locator('textarea[name="body"]').fill('Hello from E2E.\n\nThis is the body.');
  await page.locator('select[name="category"]').selectOption('programming');
  await page.locator('input[name="tags"]').fill('e2e, test');
  await page.locator('input[name="date"]').fill('2026-04-28');
  await page.locator('input[name="readTime"]').fill('1');
  await page.locator('select[name="size"]').selectOption('medium');
  await page.locator('input[name="cover"]').fill('jovian');
  await page.locator('input[name="draft"]').uncheck();

  await page.getByRole('button', { name: 'Create post' }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);
  await expect(page.getByText('e2e-test-post')).toBeVisible();

  await page.goto('/');
  await expect(page.getByText('E2E Test Post', { exact: true })).toBeVisible();

  await page.goto('/admin/posts/e2e-test-post/edit');
  await page.locator('input[name="title"]').fill('E2E Test Post (edited)');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);

  await page.goto('/');
  await expect(page.getByText('E2E Test Post (edited)')).toBeVisible();

  await page.goto('/admin/posts/e2e-test-post/edit');
  await page.getByRole('button', { name: /Delete post/ }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);

  const resp = await page.goto('/posts/e2e-test-post');
  expect(resp?.status()).toBe(404);
});
