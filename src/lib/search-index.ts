import type { Post } from './posts';

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
