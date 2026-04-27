import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestDb, seedUser, seedPosts, type TestDb } from './test-db';
import * as schema from './schema';
import { addCommentImpl, deleteCommentImpl, listCommentsImpl } from './comments';
import * as ratelimit from './ratelimit';

let db: TestDb;
let user: Awaited<ReturnType<typeof seedUser>>;

beforeEach(async () => {
  db = await makeTestDb();
  user = await seedUser(db);
  await seedPosts(db, ['x', 'y', 'why-the-jovian-moons'], user.id);
  ratelimit.reset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-26T12:00:00Z'));
});

describe('addCommentImpl', () => {
  it('writes a comment row', async () => {
    await addCommentImpl(db, user.id, 'why-the-jovian-moons', 'first');
    const rows = await db.select().from(schema.comments);
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toBe('first');
    expect(rows[0].postSlug).toBe('why-the-jovian-moons');
  });

  it('rejects empty body', async () => {
    await expect(addCommentImpl(db, user.id, 'x', '')).rejects.toThrow(/body/i);
  });

  it('rejects very long body (> 4000 chars)', async () => {
    const big = 'a'.repeat(4001);
    await expect(addCommentImpl(db, user.id, 'x', big)).rejects.toThrow(/long/i);
  });

  it('rate-limits a second comment within 30s', async () => {
    await addCommentImpl(db, user.id, 'x', 'first');
    vi.setSystemTime(new Date('2026-04-26T12:00:10Z'));
    await expect(addCommentImpl(db, user.id, 'x', 'second')).rejects.toThrow(/slow down/i);
  });

  it('allows another comment after the window passes', async () => {
    await addCommentImpl(db, user.id, 'x', 'first');
    vi.setSystemTime(new Date('2026-04-26T12:00:31Z'));
    await addCommentImpl(db, user.id, 'x', 'second');
    const rows = await db.select().from(schema.comments);
    expect(rows).toHaveLength(2);
  });
});

describe('deleteCommentImpl', () => {
  it('soft-deletes the row owned by the caller', async () => {
    await addCommentImpl(db, user.id, 'x', 'mine');
    const rows = await db.select().from(schema.comments);
    await deleteCommentImpl(db, user.id, rows[0].id);
    const after = await db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, rows[0].id));
    expect(after[0].deletedAt).not.toBeNull();
    expect(after[0].body).toBe('mine');
  });

  it('throws when deleting another user’s comment', async () => {
    await addCommentImpl(db, user.id, 'x', 'mine');
    const rows = await db.select().from(schema.comments);
    const other = await seedUser(db);
    await expect(deleteCommentImpl(db, other.id, rows[0].id)).rejects.toThrow(/not your/i);
  });

  it('is a no-op for an unknown id', async () => {
    await expect(deleteCommentImpl(db, user.id, 'no-such-id')).resolves.toBeUndefined();
  });
});

describe('listCommentsImpl', () => {
  it('returns comments for the slug oldest-first, joined with user', async () => {
    await addCommentImpl(db, user.id, 'x', 'first');
    vi.setSystemTime(new Date('2026-04-26T12:00:31Z'));
    await addCommentImpl(db, user.id, 'x', 'second');
    const list = await listCommentsImpl(db, 'x');
    expect(list.map((c) => c.body)).toEqual(['first', 'second']);
    expect(list[0].user.id).toBe(user.id);
  });

  it('does not return comments from other slugs', async () => {
    await addCommentImpl(db, user.id, 'x', 'on-x');
    vi.setSystemTime(new Date('2026-04-26T12:00:31Z'));
    await addCommentImpl(db, user.id, 'y', 'on-y');
    const list = await listCommentsImpl(db, 'x');
    expect(list).toHaveLength(1);
    expect(list[0].body).toBe('on-x');
  });
});
