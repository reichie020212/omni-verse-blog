import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestDb, seedUser, seedPosts, type TestDb } from './test-db';
import * as schema from './schema';
import {
  mergeBookmarksImpl,
  toggleBookmarkImpl,
  getMyBookmarkedSlugsImpl,
} from './bookmarks';

let db: TestDb;
let user: Awaited<ReturnType<typeof seedUser>>;

beforeEach(async () => {
  db = await makeTestDb();
  user = await seedUser(db);
  await seedPosts(db, ['a', 'b', 'c', 'x', 'y', 'foo'], user.id);
});

describe('mergeBookmarks', () => {
  it('inserts every input slug for the given user', async () => {
    const result = await mergeBookmarksImpl(db, user.id, ['a', 'b', 'c']);
    expect(result.added).toBe(3);
    const rows = await db
      .select()
      .from(schema.bookmarks)
      .where(eq(schema.bookmarks.userId, user.id));
    expect(rows.map((r) => r.postSlug).sort()).toEqual(['a', 'b', 'c']);
  });

  it('is idempotent — running twice does not duplicate rows', async () => {
    await mergeBookmarksImpl(db, user.id, ['a', 'b']);
    const result = await mergeBookmarksImpl(db, user.id, ['a', 'b']);
    expect(result.added).toBe(0);
    const rows = await db
      .select()
      .from(schema.bookmarks)
      .where(eq(schema.bookmarks.userId, user.id));
    expect(rows).toHaveLength(2);
  });

  it('preserves pre-existing rows', async () => {
    await db.insert(schema.bookmarks).values({ userId: user.id, postSlug: 'x' });
    await mergeBookmarksImpl(db, user.id, ['y']);
    const rows = await db
      .select()
      .from(schema.bookmarks)
      .where(eq(schema.bookmarks.userId, user.id));
    expect(rows.map((r) => r.postSlug).sort()).toEqual(['x', 'y']);
  });

  it('returns added=0 for empty input', async () => {
    const result = await mergeBookmarksImpl(db, user.id, []);
    expect(result.added).toBe(0);
  });
});

describe('toggleBookmarkImpl', () => {
  it('adds when absent, removes when present', async () => {
    const a = await toggleBookmarkImpl(db, user.id, 'foo');
    expect(a.bookmarked).toBe(true);
    const b = await toggleBookmarkImpl(db, user.id, 'foo');
    expect(b.bookmarked).toBe(false);
    const rows = await db
      .select()
      .from(schema.bookmarks)
      .where(eq(schema.bookmarks.userId, user.id));
    expect(rows).toHaveLength(0);
  });
});

describe('getMyBookmarkedSlugsImpl', () => {
  it('returns the user’s bookmark slugs', async () => {
    await db.insert(schema.bookmarks).values([
      { userId: user.id, postSlug: 'a' },
      { userId: user.id, postSlug: 'b' },
    ]);
    const slugs = await getMyBookmarkedSlugsImpl(db, user.id);
    expect(slugs.sort()).toEqual(['a', 'b']);
  });

  it('does not leak other users’ bookmarks', async () => {
    const other = await seedUser(db);
    await db.insert(schema.bookmarks).values({ userId: other.id, postSlug: 'a' });
    const slugs = await getMyBookmarkedSlugsImpl(db, user.id);
    expect(slugs).toEqual([]);
  });
});
