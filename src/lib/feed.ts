import type { Post } from './posts';

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildAtomFeed(posts: readonly Post[], siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  const newest = posts[0]?.date ?? new Date().toISOString().slice(0, 10);
  const updated = `${newest}T00:00:00Z`;
  const selfLink = `${base}/feed.xml`;

  const entries = posts
    .map((post) => {
      const url = `${base}/posts/${post.slug}`;
      const date = `${post.date}T00:00:00Z`;
      return `  <entry>
    <id>${url}</id>
    <link href="${url}"/>
    <title>${escape(post.title)}</title>
    <summary>${escape(post.excerpt)}</summary>
    <updated>${date}</updated>
    <published>${date}</published>
    <author><name>Red</name></author>
  </entry>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${base}/</id>
  <title>Omni-Verse Blog</title>
  <link rel="self" href="${selfLink}"/>
  <link href="${base}/"/>
  <updated>${updated}</updated>
  <author><name>Red</name></author>
${entries}
</feed>
`;
}
