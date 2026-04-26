import { describe, it, expect } from 'vitest';
import { parsePost, PostFrontmatterSchema } from './posts';

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
