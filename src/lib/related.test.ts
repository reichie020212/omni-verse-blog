import { describe, it, expect } from 'vitest';
import { rankRelated } from './related';
import type { Post } from './posts';

function p(over: Partial<Post>): Post {
  return {
    id: '0x000',
    title: 'T',
    slug: 's',
    excerpt: 'E',
    category: 'tech',
    tags: [],
    date: '2026-01-01',
    readTime: 1,
    size: 'small',
    cover: 'web',
    featured: false,
    draft: false,
    hasCoverImage: false,
    body: '',
    ...over,
  };
}

describe('rankRelated', () => {
  it('returns nothing when there are no candidates', () => {
    const current = p({ slug: 'a' });
    expect(rankRelated(current, [current])).toEqual([]);
  });

  it('ranks tag overlap higher than same-category', () => {
    const current = p({ slug: 'cur', category: 'tech', tags: ['rust', 'languages'] });
    const sameCatNoOverlap = p({ slug: 'sc', category: 'tech', tags: [] });
    const sharedOneTag = p({ slug: 'tag1', category: 'celestial', tags: ['rust'] });
    const sharedTwoTags = p({ slug: 'tag2', category: 'celestial', tags: ['rust', 'languages'] });
    const ranked = rankRelated(current, [
      current,
      sameCatNoOverlap,
      sharedOneTag,
      sharedTwoTags,
    ]);
    expect(ranked.map((r) => r.slug)).toEqual(['tag2', 'tag1', 'sc']);
  });

  it('breaks ties by date desc', () => {
    const current = p({ slug: 'cur', tags: ['x'] });
    const a = p({ slug: 'a', tags: ['x'], date: '2026-01-01' });
    const b = p({ slug: 'b', tags: ['x'], date: '2026-04-01' });
    const ranked = rankRelated(current, [current, a, b]);
    expect(ranked.map((r) => r.slug)).toEqual(['b', 'a']);
  });

  it('excludes drafts', () => {
    const current = p({ slug: 'cur', tags: ['x'] });
    const draft = p({ slug: 'd', tags: ['x'], draft: true });
    expect(rankRelated(current, [current, draft])).toEqual([]);
  });

  it('limits results to the top N (default 3)', () => {
    const current = p({ slug: 'cur', tags: ['x'] });
    const candidates = Array.from({ length: 10 }, (_, i) =>
      p({ slug: `s${i}`, id: `0x${i.toString(16).padStart(3, '0')}`, tags: ['x'] }),
    );
    const ranked = rankRelated(current, [current, ...candidates]);
    expect(ranked).toHaveLength(3);
  });

  it('respects custom limit', () => {
    const current = p({ slug: 'cur', tags: ['x'] });
    const candidates = Array.from({ length: 5 }, (_, i) =>
      p({ slug: `s${i}`, id: `0x${i.toString(16).padStart(3, '0')}`, tags: ['x'] }),
    );
    expect(rankRelated(current, [current, ...candidates], 5)).toHaveLength(5);
  });
});
