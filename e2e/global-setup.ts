import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

export default async function globalSetup(): Promise<void> {
  const dbPath = path.join(process.cwd(), 'e2e.db');
  try {
    rmSync(dbPath);
  } catch {
    /* not present, fine */
  }
  // Apply Drizzle migrations against the fresh e2e.db
  execSync('pnpm db:migrate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:e2e.db' },
  });
}
