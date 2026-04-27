import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { postCovers } from '@/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params;
  const [row] = await db
    .select()
    .from(postCovers)
    .where(eq(postCovers.postSlug, slug));
  if (!row) {
    return new Response('not found', { status: 404 });
  }
  return new Response(new Uint8Array(row.image), {
    headers: {
      'content-type': row.contentType,
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  });
}
