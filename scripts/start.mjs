import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const url = process.env.DATABASE_URL ?? 'file:/data/local.db';
const client = createClient({ url });
const db = drizzle(client);

// Idempotent: drizzle-orm reads drizzle/meta/_journal.json and applies anything new.
await migrate(db, { migrationsFolder: '/app/drizzle' });
client.close();

// Hand off to the Next.js standalone server (sibling file in /app).
await import('./server.js');
