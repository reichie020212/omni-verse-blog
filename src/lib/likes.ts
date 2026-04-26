'use server';

import { auth } from './auth';
import { db } from './db';
import { likes } from './schema';
import { revalidatePath } from 'next/cache';
import { and, count, eq } from 'drizzle-orm';

export type LikeState = { liked: boolean; count: number };

export async function getLikeState(slug: string): Promise<LikeState> {
  const session = await auth();
  const [{ c }] = await db
    .select({ c: count() })
    .from(likes)
    .where(eq(likes.postSlug, slug));
  if (!session?.user?.id) return { liked: false, count: Number(c) };
  const mine = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, session.user.id), eq(likes.postSlug, slug)));
  return { liked: mine.length > 0, count: Number(c) };
}

export async function toggleLike(slug: string): Promise<LikeState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('not signed in');
  const userId = session.user.id;
  const existing = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.postSlug, slug)));
  if (existing.length > 0) {
    await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postSlug, slug)));
  } else {
    await db.insert(likes).values({ userId, postSlug: slug });
  }
  const [{ c }] = await db
    .select({ c: count() })
    .from(likes)
    .where(eq(likes.postSlug, slug));
  revalidatePath(`/posts/${slug}`);
  return { liked: existing.length === 0, count: Number(c) };
}
