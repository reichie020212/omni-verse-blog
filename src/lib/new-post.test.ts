import { describe, expect, it } from 'vitest';
import {
  deriveSlug,
  deriveNextId,
  assembleFrontmatter,
  type NewPostInput,
} from './new-post';

describe('deriveSlug', () => {
  it('lowercases and replaces non-alphanumerics with dashes', () => {
    expect(deriveSlug('Hello, World! 2026')).toBe('hello-world-2026');
  });

  it('collapses runs of dashes', () => {
    expect(deriveSlug('foo --- bar')).toBe('foo-bar');
  });

  it('trims leading and trailing dashes', () => {
    expect(deriveSlug('---foo bar---')).toBe('foo-bar');
  });

  it('passes through already-valid slugs', () => {
    expect(deriveSlug('a-week-in-lisbon')).toBe('a-week-in-lisbon');
  });

  it('throws on titles that produce empty slugs', () => {
    expect(() => deriveSlug('!!!')).toThrow(/slug/i);
  });
});

describe('deriveNextId', () => {
  it('returns 0x000 for empty list', () => {
    expect(deriveNextId([])).toBe('0x000');
  });

  it('returns max+1 in lowercase 3-digit hex', () => {
    expect(deriveNextId(['0x000', '0x001', '0x00f'])).toBe('0x010');
  });

  it('throws when the next id overflows 0xfff', () => {
    expect(() => deriveNextId(['0xfff'])).toThrow(/overflow/i);
  });

  it('ignores ids that do not match the pattern', () => {
    expect(deriveNextId(['bogus', '0x005', 'also-bogus'])).toBe('0x006');
  });
});

describe('assembleFrontmatter', () => {
  const input: NewPostInput = {
    id: '0x010',
    slug: 'my-new-post',
    title: 'My New Post',
    excerpt: 'A short summary.',
    category: 'tech',
    tags: ['tag-a', 'tag-b'],
    date: '2026-04-26',
    size: 'medium',
    cover: 'jovian',
  };

  it('produces YAML frontmatter with the expected fields', () => {
    const yaml = assembleFrontmatter(input);
    expect(yaml).toContain('---');
    expect(yaml).toContain("id: '0x010'");
    expect(yaml).toContain('slug: my-new-post');
    expect(yaml).toContain('title: My New Post');
    expect(yaml).toContain('category: tech');
    expect(yaml).toContain('tags: [tag-a, tag-b]');
    expect(yaml).toContain("date: '2026-04-26'");
    expect(yaml).toContain('readTime: 1');
    expect(yaml).toContain('size: medium');
    expect(yaml).toContain('cover: jovian');
    expect(yaml).toContain('draft: true');
  });

  it('quotes titles containing single quotes correctly', () => {
    const yaml = assembleFrontmatter({ ...input, title: "Don't break" });
    expect(yaml).toMatch(/title: "Don't break"/);
  });

  it('renders empty tag list as []', () => {
    const yaml = assembleFrontmatter({ ...input, tags: [] });
    expect(yaml).toContain('tags: []');
  });
});

import matter from 'gray-matter';
import { PostFrontmatterSchema } from './posts';

describe('assembleFrontmatter integration', () => {
  it('produces frontmatter that PostFrontmatterSchema accepts', () => {
    const input: NewPostInput = {
      id: '0x010',
      slug: 'my-new-post',
      title: 'My New Post',
      excerpt: 'A short summary.',
      category: 'tech',
      tags: ['tag-a', 'tag-b'],
      date: '2026-04-26',
      size: 'medium',
      cover: 'jovian',
    };
    const file = assembleFrontmatter(input);
    const { data } = matter(file);
    expect(() => PostFrontmatterSchema.parse(data)).not.toThrow();
  });
});
