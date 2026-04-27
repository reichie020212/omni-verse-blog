import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { makeTestDb } from './test-db';
import { signupImpl, verifyCredentialsImpl } from './signup';
import { users } from './schema';

describe('signupImpl', () => {
  it('creates a user with a hashed password and lowercased username', async () => {
    const db = await makeTestDb();
    const result = await signupImpl(db as never, { username: 'NewUser', password: 'hunter2hunter' });
    expect(result.ok).toBe(true);
    const row = await db.query.users.findFirst({ where: eq(users.username, 'newuser') });
    expect(row?.username).toBe('newuser');
    expect(row?.role).toBe('user');
    expect(row?.passwordHash).toBeDefined();
    expect(row?.passwordHash).not.toBe('hunter2hunter');
    expect(await bcrypt.compare('hunter2hunter', row!.passwordHash!)).toBe(true);
  });

  it('rejects duplicate usernames (case-insensitive)', async () => {
    const db = await makeTestDb();
    await signupImpl(db as never, { username: 'red', password: 'password1' });
    const result = await signupImpl(db as never, { username: 'RED', password: 'password2' });
    expect(result).toEqual({ ok: false, error: 'username is already taken' });
  });

  it.each([
    [{ username: 'ab', password: 'longenough' }, /username must be at least 3/],
    [{ username: 'has space', password: 'longenough' }, /letters, numbers, and underscores/],
    [{ username: 'ok', password: 'short' }, /username must be at least 3/], // username error wins
    [{ username: 'okuser', password: 'short' }, /password must be at least 8/],
  ])('rejects invalid input %#', async (input, errPattern) => {
    const db = await makeTestDb();
    const result = await signupImpl(db as never, input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(errPattern);
  });
});

describe('verifyCredentialsImpl', () => {
  it('returns user when password matches', async () => {
    const db = await makeTestDb();
    await signupImpl(db as never, { username: 'red', password: 'hunter2hunter' });
    const result = await verifyCredentialsImpl(db as never, { username: 'red', password: 'hunter2hunter' });
    expect(result).toMatchObject({ name: 'red', role: 'user' });
  });

  it('returns null when password does not match', async () => {
    const db = await makeTestDb();
    await signupImpl(db as never, { username: 'red', password: 'hunter2hunter' });
    const result = await verifyCredentialsImpl(db as never, { username: 'red', password: 'wrong' });
    expect(result).toBeNull();
  });

  it('returns null for unknown username', async () => {
    const db = await makeTestDb();
    const result = await verifyCredentialsImpl(db as never, { username: 'ghost', password: 'whatever' });
    expect(result).toBeNull();
  });

  it('returns null for OAuth-only users (no passwordHash)', async () => {
    const db = await makeTestDb();
    await db.insert(users).values({ username: 'oauth_only', name: 'OAuth User' });
    const result = await verifyCredentialsImpl(db as never, { username: 'oauth_only', password: 'any' });
    expect(result).toBeNull();
  });
});
