import type { DB } from './db';
import { bookmarks } from './schema';
import { and, eq } from 'drizzle-orm';

export type BookmarkState = { bookmarked: boolean };

export async function mergeBookmarksImpl(
  db: DB,
  userId: string,
  localSlugs: string[],
): Promise<{ added: number }> {
  if (localSlugs.length === 0) return { added: 0 };
  const rows = localSlugs.map((slug) => ({ userId, postSlug: slug }));
  const result = await db
    .insert(bookmarks)
    .values(rows)
    .onConflictDoNothing()
    .returning();
  return { added: result.length };
}

export async function toggleBookmarkImpl(
  db: DB,
  userId: string,
  slug: string,
): Promise<BookmarkState> {
  const existing = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postSlug, slug)));
  if (existing.length > 0) {
    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postSlug, slug)));
    return { bookmarked: false };
  }
  await db.insert(bookmarks).values({ userId, postSlug: slug });
  return { bookmarked: true };
}

export async function getMyBookmarkedSlugsImpl(
  db: DB,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ postSlug: bookmarks.postSlug })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));
  return rows.map((r) => r.postSlug);
}
