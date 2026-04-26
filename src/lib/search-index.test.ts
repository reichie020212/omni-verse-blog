import { describe, it, expect } from 'vitest';
import { buildSearchIndex } from './search-index';
import type { Post } from './posts';

const POSTS: Post[] = [
  {
    id: '0x002', title: 'B', slug: 'b', excerpt: 'eb',
    category: 'tech', tags: ['x'], date: '2026-04-02',
    readTime: 3, size: 'small', cover: 'web',
    featured: false, draft: false, body: 'BODY-B',
  },
  {
    id: '0x001', title: 'A', slug: 'a', excerpt: 'ea',
    category: 'tech', tags: ['x', 'y'], date: '2026-04-01',
    readTime: 3, size: 'small', cover: 'web',
    featured: false, draft: false, body: 'BODY-A',
  },
];

describe('buildSearchIndex', () => {
  it('emits one entry per post with only indexable fields', () => {
    const index = buildSearchIndex(POSTS);
    expect(index).toHaveLength(2);
    expect(Object.keys(index[0]).sort()).toEqual(
      ['category', 'excerpt', 'slug', 'tags', 'title'].sort(),
    );
  });

  it('strips body and other fields', () => {
    const index = buildSearchIndex(POSTS);
    expect((index[0] as unknown as { body: string }).body).toBeUndefined();
    expect((index[0] as unknown as { date: string }).date).toBeUndefined();
  });

  it('orders entries by slug ascending for deterministic output', () => {
    const index = buildSearchIndex(POSTS);
    expect(index.map((e) => e.slug)).toEqual(['a', 'b']);
  });
});
