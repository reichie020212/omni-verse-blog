import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestDb, seedUser, type TestDb } from './test-db';
import { posts as postsTable } from './schema';
import { upsertPostImpl, deletePostImpl } from './posts-admin';

let db: TestDb;
let admin: Awaited<ReturnType<typeof seedUser>>;

beforeEach(async () => {
  db = await makeTestDb();
  admin = await seedUser(db);
});

const baseInput = {
  slug: 'hello-world',
  title: 'Hello world',
  excerpt: 'A first post.',
  body: 'Hello, **world**.',
  category: 'programming',
  tags: ['intro'],
  date: '2026-04-28',
  readTime: 2,
  size: 'medium' as const,
  cover: 'jovian',
  featured: false,
  draft: true,
};

describe('upsertPostImpl', () => {
  it('inserts a new post and auto-generates a hex id', async () => {
    const { slug, created } = await upsertPostImpl(db, admin.id, baseInput);
    expect(slug).toBe('hello-world');
    expect(created).toBe(true);

    const [row] = await db.select().from(postsTable).where(eq(postsTable.slug, 'hello-world'));
    expect(row.title).toBe('Hello world');
    expect(row.id).toMatch(/^0x[0-9a-f]{3}$/);
    expect(row.authorId).toBe(admin.id);
  });

  it('produces a fresh id per insert (max + 1)', async () => {
    await upsertPostImpl(db, admin.id, { ...baseInput, slug: 'a' });
    await upsertPostImpl(db, admin.id, { ...baseInput, slug: 'b' });
    const rows = await db.select({ id: postsTable.id }).from(postsTable);
    const ids = rows.map((r) => parseInt(r.id.slice(2), 16)).sort((x, y) => x - y);
    expect(ids[1]).toBe(ids[0] + 1);
  });

  it('updates an existing post and preserves its id', async () => {
    const first = await upsertPostImpl(db, admin.id, baseInput);
    const [before] = await db.select().from(postsTable).where(eq(postsTable.slug, first.slug));

    const { created } = await upsertPostImpl(db, admin.id, {
      ...baseInput,
      title: 'Hello, edited',
      draft: false,
    });
    expect(created).toBe(false);

    const [after] = await db.select().from(postsTable).where(eq(postsTable.slug, first.slug));
    expect(after.title).toBe('Hello, edited');
    expect(after.draft).toBe(false);
    expect(after.id).toBe(before.id);
  });

  it('rejects an invalid category', async () => {
    await expect(
      upsertPostImpl(db, admin.id, { ...baseInput, category: 'nope' }),
    ).rejects.toThrow(/category/i);
  });

  it('rejects an invalid slug', async () => {
    await expect(
      upsertPostImpl(db, admin.id, { ...baseInput, slug: 'Bad Slug' }),
    ).rejects.toThrow(/slug/i);
  });

  it('rejects an invalid date format', async () => {
    await expect(
      upsertPostImpl(db, admin.id, { ...baseInput, date: '04-28-2026' }),
    ).rejects.toThrow(/date/i);
  });
});

describe('deletePostImpl', () => {
  it('removes the row by slug', async () => {
    await upsertPostImpl(db, admin.id, baseInput);
    await deletePostImpl(db, baseInput.slug);
    const rows = await db.select().from(postsTable).where(eq(postsTable.slug, baseInput.slug));
    expect(rows).toHaveLength(0);
  });

  it('is a no-op when the slug does not exist', async () => {
    await expect(deletePostImpl(db, 'nope')).resolves.toBeUndefined();
  });
});
