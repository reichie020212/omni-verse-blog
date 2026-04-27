import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  parsePost,
  PostFrontmatterSchema,
  assertUniqueIdsAndSlugs,
  loadPostsFromDir,
  getAllPostsImpl,
  getPostBySlugImpl,
  type Post,
} from './posts';
import { makeTestDb, seedUser } from './test-db';
import { posts as postsTable } from './schema';

const VALID = `---
id: '0x4f2'
title: 'Why the Jovian moons still keep me up at night'
slug: 'why-the-jovian-moons'
excerpt: 'Europa hides an ocean.'
category: celestial
tags: [astronomy, jupiter]
date: '2026-04-22'
readTime: 9
size: hero
cover: jovian
featured: true
---
Body here.

## A heading

More body.`;

describe('parsePost', () => {
  it('parses a valid post', () => {
    const post = parsePost('why-the-jovian-moons.mdx', VALID);
    expect(post.id).toBe('0x4f2');
    expect(post.slug).toBe('why-the-jovian-moons');
    expect(post.tags).toEqual(['astronomy', 'jupiter']);
    expect(post.featured).toBe(true);
    expect(post.draft).toBe(false);
    expect(post.body).toContain('## A heading');
  });

  it('throws when filename does not match slug', () => {
    expect(() => parsePost('different-slug.mdx', VALID)).toThrow(/slug.*filename/i);
  });

  it('throws when category is unknown', () => {
    const bad = VALID.replace('category: celestial', 'category: nonexistent');
    expect(() => parsePost('why-the-jovian-moons.mdx', bad)).toThrow(/category/i);
  });

  it('throws when required fields are missing', () => {
    const bad = VALID.replace(/^id:.*$/m, '');
    expect(() => parsePost('why-the-jovian-moons.mdx', bad)).toThrow();
  });

  it('throws when id has wrong format', () => {
    const bad = VALID.replace("id: '0x4f2'", "id: 'not-hex'");
    expect(() => parsePost('why-the-jovian-moons.mdx', bad)).toThrow(/id/i);
  });

  it('throws when size is invalid', () => {
    const bad = VALID.replace('size: hero', 'size: gigantic');
    expect(() => parsePost('why-the-jovian-moons.mdx', bad)).toThrow(/size/i);
  });

  it('defaults featured and draft to false when absent', () => {
    const minimal = VALID.replace('featured: true\n', '');
    const post = parsePost('why-the-jovian-moons.mdx', minimal);
    expect(post.featured).toBe(false);
    expect(post.draft).toBe(false);
  });
});

describe('PostFrontmatterSchema', () => {
  it('accepts a fully-typed frontmatter object', () => {
    const result = PostFrontmatterSchema.safeParse({
      id: '0x4f2',
      title: 'T',
      slug: 'why-the-jovian-moons',
      excerpt: 'E',
      category: 'celestial',
      tags: ['a'],
      date: '2026-04-22',
      readTime: 9,
      size: 'hero',
      cover: 'jovian',
    });
    expect(result.success).toBe(true);
  });
});

function makePost(slug: string, overrides: Record<string, string> = {}) {
  const fm = {
    id: "'0x4f0'",
    title: "'T'",
    slug: `'${slug}'`,
    excerpt: "'E'",
    category: 'celestial',
    tags: '[a]',
    date: "'2026-04-22'",
    readTime: '9',
    size: 'hero',
    cover: 'jovian',
    ...overrides,
  };
  const body = Object.entries(fm)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  return `---\n${body}\n---\nBody`;
}

describe('loadPostsFromDir + assertUniqueIdsAndSlugs', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'posts-'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'post-a.mdx'), makePost('post-a', { id: "'0x001'" }));
    writeFileSync(path.join(dir, 'post-b.mdx'), makePost('post-b', { id: "'0x002'" }));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('loads all valid posts', async () => {
    const posts = await loadPostsFromDir(dir);
    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.slug).sort()).toEqual(['post-a', 'post-b']);
  });

  it('passes uniqueness check when all ids and slugs are unique', async () => {
    const posts = await loadPostsFromDir(dir);
    expect(() => assertUniqueIdsAndSlugs(posts)).not.toThrow();
  });

  it('throws when two posts share an id', () => {
    const dupes = [
      { id: '0x001', slug: 'a' } as never,
      { id: '0x001', slug: 'b' } as never,
    ];
    expect(() => assertUniqueIdsAndSlugs(dupes)).toThrow(/duplicate id/i);
  });

  it('throws when two posts share a slug', () => {
    const dupes = [
      { id: '0x001', slug: 'a' } as never,
      { id: '0x002', slug: 'a' } as never,
    ];
    expect(() => assertUniqueIdsAndSlugs(dupes)).toThrow(/duplicate slug/i);
  });
});

describe('sort and draft handling', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'posts-sort-'));
    writeFileSync(path.join(dir, 'old.mdx'), makePost('old', { id: "'0x010'", date: "'2026-01-01'" }));
    writeFileSync(path.join(dir, 'new.mdx'), makePost('new', { id: "'0x011'", date: "'2026-04-01'" }));
    writeFileSync(
      path.join(dir, 'wip.mdx'),
      makePost('wip', { id: "'0x012'", date: "'2025-12-01'", draft: 'true' }),
    );
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('sorts newest-first', async () => {
    const posts = await loadPostsFromDir(dir);
    expect(posts[0].slug).toBe('new');
    expect(posts[1].slug).toBe('old');
  });

  it('keeps drafts in development load', async () => {
    const posts = await loadPostsFromDir(dir, { includeDrafts: true });
    expect(posts.some((p) => p.draft)).toBe(true);
  });

  it('strips drafts when includeDrafts is false', async () => {
    const posts = await loadPostsFromDir(dir, { includeDrafts: false });
    expect(posts.some((p) => p.draft)).toBe(false);
  });
});

describe('DB-backed impls', () => {
  function rowFor(slug: string, overrides: Partial<typeof postsTable.$inferInsert> = {}) {
    return {
      slug,
      id: `0x${slug.charCodeAt(0).toString(16).padStart(3, '0')}`,
      title: `Title ${slug}`,
      excerpt: `Excerpt ${slug}`,
      body: `Body ${slug}`,
      category: 'celestial',
      tags: ['x'],
      date: '2026-04-22',
      readTime: 7,
      size: 'medium' as const,
      cover: 'jovian',
      featured: false,
      draft: false,
      authorId: '',
      ...overrides,
    };
  }

  it('getAllPostsImpl returns posts newest-first and strips drafts when asked', async () => {
    const db = await makeTestDb();
    const author = await seedUser(db);
    await db.insert(postsTable).values([
      rowFor('a', { date: '2026-01-01', authorId: author.id }),
      rowFor('b', { date: '2026-04-01', authorId: author.id }),
      rowFor('c', { date: '2025-12-01', draft: true, authorId: author.id }),
    ]);

    const all = await getAllPostsImpl(db, { includeDrafts: true });
    expect(all.map((p) => p.slug)).toEqual(['b', 'a', 'c']);

    const published = await getAllPostsImpl(db, { includeDrafts: false });
    expect(published.map((p) => p.slug)).toEqual(['b', 'a']);
  });

  it('getAllPostsImpl maps tags JSON, booleans, and the size enum to the Post shape', async () => {
    const db = await makeTestDb();
    const author = await seedUser(db);
    await db.insert(postsTable).values([
      rowFor('mapping', { tags: ['one', 'two'], featured: true, size: 'hero', authorId: author.id }),
    ]);

    const [post] = await getAllPostsImpl(db);
    const expected: Pick<Post, 'tags' | 'featured' | 'size'> = {
      tags: ['one', 'two'],
      featured: true,
      size: 'hero',
    };
    expect(post.tags).toEqual(expected.tags);
    expect(post.featured).toBe(expected.featured);
    expect(post.size).toBe(expected.size);
  });

  it('getPostBySlugImpl returns a hit and undefined for misses', async () => {
    const db = await makeTestDb();
    const author = await seedUser(db);
    await db.insert(postsTable).values([rowFor('hit', { authorId: author.id })]);

    const hit = await getPostBySlugImpl(db, 'hit');
    expect(hit?.slug).toBe('hit');

    const miss = await getPostBySlugImpl(db, 'nope');
    expect(miss).toBeUndefined();
  });

  it('round-trips a parsed MDX post through the DB unchanged', async () => {
    const db = await makeTestDb();
    const author = await seedUser(db);
    const post = parsePost('why-the-jovian-moons.mdx', VALID);
    await db.insert(postsTable).values({
      slug: post.slug,
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      category: post.category,
      tags: post.tags,
      date: post.date,
      readTime: post.readTime,
      size: post.size,
      cover: post.cover,
      featured: post.featured,
      draft: post.draft,
      authorId: author.id,
    });

    const roundTripped = await getPostBySlugImpl(db, post.slug, { includeDrafts: true });
    expect(roundTripped).toEqual(post);
  });

  it('getPostBySlugImpl hides drafts in production-mode lookups', async () => {
    const db = await makeTestDb();
    const author = await seedUser(db);
    await db.insert(postsTable).values([rowFor('wip', { draft: true, authorId: author.id })]);

    const withDrafts = await getPostBySlugImpl(db, 'wip', { includeDrafts: true });
    expect(withDrafts?.slug).toBe('wip');

    const withoutDrafts = await getPostBySlugImpl(db, 'wip', { includeDrafts: false });
    expect(withoutDrafts).toBeUndefined();
  });
});

describe('applySort', () => {
  const a = { slug: 'a', date: '2026-01-01' } as never;
  const b = { slug: 'b', date: '2026-04-01' } as never;
  const c = { slug: 'c', date: '2026-02-01' } as never;
  const newestFirst = [b, c, a];

  it('returns the input unchanged when sort is "newest"', async () => {
    const { applySort } = await import('./posts');
    expect(applySort(newestFirst, 'newest')).toEqual(newestFirst);
  });

  it('reverses to oldest-first when sort is "oldest"', async () => {
    const { applySort } = await import('./posts');
    expect(applySort(newestFirst, 'oldest')).toEqual([a, c, b]);
  });
});
