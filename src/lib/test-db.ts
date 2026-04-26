import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import path from 'node:path';
import * as schema from './schema';

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export async function makeTestDb(): Promise<TestDb> {
  const client = createClient({ url: ':memory:' });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  return db;
}

export async function seedUser(
  db: TestDb,
  overrides: Partial<{ id: string; name: string; email: string; image: string }> = {},
): Promise<{ id: string; name: string; email: string; image: string }> {
  const user = {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? `${crypto.randomUUID()}@test.local`,
    image: overrides.image ?? 'https://example.test/avatar.png',
  };
  await db.insert(schema.users).values(user);
  return user;
}
