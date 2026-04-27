import path from 'node:path';
import { writeFile, mkdir, rename } from 'node:fs/promises';
import { getAllPostsImpl, type Post } from './posts';
import type { DB } from './db';

export type SearchIndexEntry = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
};

export function buildSearchIndex(posts: Post[]): SearchIndexEntry[] {
  return posts
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      tags: p.tags,
      category: p.category,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export const SEARCH_INDEX_PATH = path.join(process.cwd(), 'data', 'search-index.json');

export async function regenerateSearchIndex(db: DB): Promise<number> {
  const posts = await getAllPostsImpl(db, { includeDrafts: false });
  const index = buildSearchIndex(posts);
  await mkdir(path.dirname(SEARCH_INDEX_PATH), { recursive: true });
  const tmp = `${SEARCH_INDEX_PATH}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(index), 'utf8');
  await rename(tmp, SEARCH_INDEX_PATH);
  return index.length;
}
