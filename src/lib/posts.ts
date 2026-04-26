import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { cache } from 'react';
import { z } from 'zod';
import { CATEGORY_IDS } from './categories';

export const PostFrontmatterSchema = z.object({
  id: z.string().regex(/^0x[0-9a-f]{3}$/, 'id must be 0x followed by 3 hex digits'),
  title: z.string().min(1),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case alphanumerics'),
  excerpt: z.string().min(1),
  category: z.string().refine((v) => (CATEGORY_IDS as readonly string[]).includes(v), {
    message: `category must be one of: ${CATEGORY_IDS.join(', ')}`,
  }),
  tags: z.array(z.string().min(1)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be ISO YYYY-MM-DD'),
  readTime: z.number().int().positive(),
  size: z.enum(['hero', 'wide', 'medium', 'small']),
  cover: z.string().min(1),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
});

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;
export type Post = PostFrontmatter & { body: string };
export type LoadOptions = { includeDrafts?: boolean };

export function parsePost(filename: string, source: string): Post {
  const expectedSlug = filename.replace(/\.mdx$/, '');
  const { data, content } = matter(source);
  const fm = PostFrontmatterSchema.parse(data);
  if (fm.slug !== expectedSlug) {
    throw new Error(
      `frontmatter slug "${fm.slug}" does not match filename "${filename}"`,
    );
  }
  return { ...fm, body: content };
}

export function assertUniqueIdsAndSlugs(posts: Pick<Post, 'id' | 'slug'>[]): void {
  const idCounts = new Map<string, number>();
  const slugCounts = new Map<string, number>();
  for (const p of posts) {
    idCounts.set(p.id, (idCounts.get(p.id) ?? 0) + 1);
    slugCounts.set(p.slug, (slugCounts.get(p.slug) ?? 0) + 1);
  }
  const dupIds = [...idCounts.entries()].filter(([, c]) => c > 1).map(([id]) => id);
  const dupSlugs = [...slugCounts.entries()].filter(([, c]) => c > 1).map(([s]) => s);
  if (dupIds.length) throw new Error(`duplicate id(s) across posts: ${dupIds.join(', ')}`);
  if (dupSlugs.length) throw new Error(`duplicate slug(s) across posts: ${dupSlugs.join(', ')}`);
}

export async function loadPostsFromDir(
  dir: string,
  opts: LoadOptions = { includeDrafts: process.env.NODE_ENV !== 'production' },
): Promise<Post[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.mdx'));
  const posts = await Promise.all(
    files.map(async (filename) => {
      const source = await readFile(path.join(dir, filename), 'utf8');
      return parsePost(filename, source);
    }),
  );
  assertUniqueIdsAndSlugs(posts);
  return posts
    .filter((p) => (opts.includeDrafts ? true : !p.draft))
    .sort((a, b) => b.date.localeCompare(a.date));
}

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export const getAllPosts = cache(async (): Promise<Post[]> => {
  return loadPostsFromDir(POSTS_DIR);
});

export const getPostBySlug = cache(async (slug: string): Promise<Post | undefined> => {
  const all = await getAllPosts();
  return all.find((p) => p.slug === slug);
});

export const getPostsByCategory = cache(async (id: string): Promise<Post[]> => {
  const all = await getAllPosts();
  return id === 'all' ? all : all.filter((p) => p.category === id);
});

export const getPostsByTag = cache(async (tag: string): Promise<Post[]> => {
  const all = await getAllPosts();
  return all.filter((p) => p.tags.includes(tag));
});

export async function getAllTags(): Promise<{ name: string; count: number }[]> {
  const all = await getAllPosts();
  const counts = new Map<string, number>();
  for (const p of all) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const all = await getAllPosts();
  const out: Record<string, number> = { all: all.length };
  for (const p of all) out[p.category] = (out[p.category] ?? 0) + 1;
  return out;
}

export type Sort = 'newest' | 'oldest';

export function applySort<T extends { date: string }>(
  posts: readonly T[],
  sort: Sort,
): T[] {
  if (sort === 'oldest') {
    return [...posts].sort((a, b) => a.date.localeCompare(b.date));
  }
  return [...posts];
}
