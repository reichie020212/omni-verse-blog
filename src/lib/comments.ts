import type { DB } from './db';
import { comments } from './schema';
import { asc, eq } from 'drizzle-orm';
import { check as ratelimitCheck } from './ratelimit';

export type CommentRow = typeof comments.$inferSelect & {
  user: { id: string; name: string | null; image: string | null };
};

export async function addCommentImpl(
  db: DB,
  userId: string,
  slug: string,
  body: string,
): Promise<void> {
  if (!slug || !body.trim()) throw new Error('missing slug or body');
  if (body.length > 4000) throw new Error('comment too long');
  const guard = ratelimitCheck(userId);
  if (!guard.allowed) {
    throw new Error(`slow down — try again in ${Math.ceil(guard.waitMs / 1000)}s`);
  }
  await db.insert(comments).values({ userId, postSlug: slug, body });
}

export async function deleteCommentImpl(
  db: DB,
  userId: string,
  id: string,
): Promise<void> {
  const rows = await db.select().from(comments).where(eq(comments.id, id));
  if (rows.length === 0) return;
  if (rows[0].userId !== userId) throw new Error('not your comment');
  await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, id));
}

export async function listCommentsImpl(db: DB, slug: string): Promise<CommentRow[]> {
  return db.query.comments.findMany({
    where: eq(comments.postSlug, slug),
    orderBy: asc(comments.createdAt),
    with: { user: { columns: { id: true, name: true, image: true } } },
  });
}
