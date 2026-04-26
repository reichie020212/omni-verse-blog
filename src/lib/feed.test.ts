import { describe, expect, it } from 'vitest';
import { buildAtomFeed } from './feed';
import type { Post } from './posts';

const post = (over: Partial<Post> = {}): Post => ({
  id: '0x001',
  slug: 'hello',
  title: 'Hello',
  excerpt: 'A summary.',
  category: 'tech',
  tags: ['t'],
  date: '2026-04-25',
  readTime: 3,
  size: 'medium',
  cover: 'jovian',
  featured: false,
  draft: false,
  body: 'body',
  ...over,
});

describe('buildAtomFeed', () => {
  it('returns Atom XML with the right root element', () => {
    const xml = buildAtomFeed([post()], 'http://localhost:3000');
    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
  });

  it('includes one <entry> per post', () => {
    const xml = buildAtomFeed([post({ slug: 'a' }), post({ slug: 'b' })], 'http://localhost:3000');
    const entries = xml.match(/<entry>/g) ?? [];
    expect(entries.length).toBe(2);
  });

  it('escapes ampersands and angle brackets in title and summary', () => {
    const xml = buildAtomFeed(
      [post({ title: 'A & B', excerpt: 'x < y' })],
      'http://localhost:3000',
    );
    expect(xml).toContain('A &amp; B');
    expect(xml).toContain('x &lt; y');
  });

  it('uses excerpt as summary, not body', () => {
    const xml = buildAtomFeed(
      [post({ excerpt: 'short summary', body: 'long body here' })],
      'http://localhost:3000',
    );
    expect(xml).toContain('short summary');
    expect(xml).not.toContain('long body here');
  });

  it('includes per-post id and link as full URL', () => {
    const xml = buildAtomFeed([post({ slug: 'hello' })], 'http://localhost:3000');
    expect(xml).toContain('http://localhost:3000/posts/hello');
  });

  it('strips trailing slash from base URL', () => {
    const xml = buildAtomFeed([post({ slug: 'hello' })], 'http://localhost:3000/');
    expect(xml).not.toContain('http://localhost:3000//');
  });

  it('sets feed updated to newest post date when posts exist', () => {
    const xml = buildAtomFeed(
      [post({ slug: 'a', date: '2026-04-26' }), post({ slug: 'b', date: '2026-04-20' })],
      'http://localhost:3000',
    );
    expect(xml).toMatch(/<updated>2026-04-26T00:00:00Z<\/updated>/);
  });

  it('handles empty post list', () => {
    const xml = buildAtomFeed([], 'http://localhost:3000');
    expect(xml).toContain('<feed');
    expect(xml).not.toContain('<entry>');
  });
});
