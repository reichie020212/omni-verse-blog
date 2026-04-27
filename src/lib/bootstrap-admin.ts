import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { env } from './env';
import { users } from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __OMNI_ADMIN_BOOTSTRAPPED__: boolean | undefined;
}

export async function bootstrapAdmin(): Promise<void> {
  if (globalThis.__OMNI_ADMIN_BOOTSTRAPPED__) return;
  globalThis.__OMNI_ADMIN_BOOTSTRAPPED__ = true;

  const username = env.ADMIN_USERNAME?.toLowerCase();
  const password = env.ADMIN_PASSWORD;
  if (!username || !password) return;

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!existing) {
    await db.insert(users).values({
      username,
      name: username,
      passwordHash,
      role: 'admin',
    });
    return;
  }

  const needsHashUpdate = !existing.passwordHash
    || !(await bcrypt.compare(password, existing.passwordHash));
  if (needsHashUpdate || existing.role !== 'admin') {
    await db
      .update(users)
      .set({
        passwordHash: needsHashUpdate ? passwordHash : existing.passwordHash,
        role: 'admin',
      })
      .where(eq(users.id, existing.id));
  }
}
