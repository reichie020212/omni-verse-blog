import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function checkA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (blocking.length > 0) {
    const lines = blocking
      .map((v) => `  - ${v.id} [${v.impact}]: ${v.description}\n    ${v.helpUrl}`)
      .join('\n');
    throw new Error(`a11y violations:\n${lines}`);
  }
}

export async function signInAsE2E(page: Page): Promise<void> {
  await page.goto('/signin');
  await page.getByTestId('e2e-signin').click();
  await expect(page).toHaveURL(/\/$|\/(?!signin)/);
}
