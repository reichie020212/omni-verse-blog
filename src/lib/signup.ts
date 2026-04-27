import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { DB } from './db';
import { users } from './schema';

export const usernameSchema = z
  .string()
  .min(3, 'username must be at least 3 characters')
  .max(32, 'username must be at most 32 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'username can only contain letters, numbers, and underscores');

export const passwordSchema = z
  .string()
  .min(8, 'password must be at least 8 characters')
  .max(72, 'password must be at most 72 characters');

export const signupSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;

export type SignupResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function signupImpl(
  db: DB,
  raw: { username?: unknown; password?: unknown },
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid input' };
  }
  const { username, password } = parsed.data;
  const normalized = username.toLowerCase();

  const existing = await db.query.users.findFirst({
    where: eq(users.username, normalized),
  });
  if (existing) {
    return { ok: false, error: 'username is already taken' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(users)
    .values({
      username: normalized,
      name: normalized,
      passwordHash,
      role: 'user',
    })
    .returning({ id: users.id });

  return { ok: true, userId: created.id };
}

export async function verifyCredentialsImpl(
  db: DB,
  raw: { username?: unknown; password?: unknown },
): Promise<{ id: string; name: string | null; role: string } | null> {
  const parsed = z.object({ username: z.string(), password: z.string() }).safeParse(raw);
  if (!parsed.success) return null;
  const username = parsed.data.username.trim().toLowerCase();
  const found = await db.query.users.findFirst({
    where: eq(users.username, username),
  });
  if (!found?.passwordHash) return null;
  const ok = await bcrypt.compare(parsed.data.password, found.passwordHash);
  if (!ok) return null;
  return { id: found.id, name: found.name, role: found.role };
}
