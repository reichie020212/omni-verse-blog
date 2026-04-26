import { env } from '@/lib/env';
import { getAllPosts } from '@/lib/posts';
import { buildAtomFeed } from '@/lib/feed';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  const posts = (await getAllPosts()).slice(0, 30);
  const xml = buildAtomFeed(posts, env.SITE_URL);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
