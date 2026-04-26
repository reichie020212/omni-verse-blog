import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `pnpm build && DATABASE_URL=file:e2e.db E2E_TEST=1 pnpm start`,
    port: PORT,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: 'file:e2e.db',
      E2E_TEST: '1',
      AUTH_SECRET: 'test-secret-test-secret-test-secret-aaaaa',
      SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
