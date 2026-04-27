import { execSync } from 'node:child_process';
import { createClient } from '@libsql/client';
import path from 'node:path';

export default async function globalSetup(): Promise<void> {
  const dbPath = path.join(process.cwd(), 'e2e.db');
  const dbUrl = `file:${dbPath}`;

  // Apply Drizzle migrations (no-op if already at latest schema).
  // NOTE: Do NOT delete the file here — the webServer is already running and has
  // an open connection to e2e.db.  Replacing the file would change its inode and
  // trigger SQLITE_READONLY_DBMOVED on the server's next write.
  execSync('pnpm db:migrate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });

  // Wipe all user-created rows so each test run starts clean.
  // This is safe because we share the same file (same inode) as the server.
  // Posts must be wiped before users (posts.author_id references "user").
  const client = createClient({ url: dbUrl });
  try {
    await client.executeMultiple(`
      DELETE FROM comments;
      DELETE FROM bookmarks;
      DELETE FROM likes;
      DELETE FROM posts;
      DELETE FROM session;
      DELETE FROM account;
      DELETE FROM "user";
    `);
  } finally {
    client.close();
  }

  // Re-populate posts from content/posts/ so reader-facing tests have a real
  // grid to render. migrate-posts-to-db.ts also bootstraps the admin user
  // (ADMIN_USERNAME/ADMIN_PASSWORD from .env.local).
  execSync('pnpm migrate:posts', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
}
