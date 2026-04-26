'use server';

import { auth } from './auth';
import { db } from './db';
import { revalidatePath } from 'next/cache';
import {
  type BookmarkState,
  getMyBookmarkedSlugsImpl,
  mergeBookmarksImpl,
  toggleBookmarkImpl,
} from './bookmarks';

export async function getMyBookmarkedSlugs(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  return getMyBookmarkedSlugsImpl(db, session.user.id);
}

export async function toggleBookmark(slug: string): Promise<BookmarkState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('not signed in');
  const result = await toggleBookmarkImpl(db, session.user.id, slug);
  revalidatePath('/bookmarks');
  return result;
}

export async function mergeBookmarks(localSlugs: string[]): Promise<{ added: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('not signed in');
  const result = await mergeBookmarksImpl(db, session.user.id, localSlugs);
  revalidatePath('/bookmarks');
  return result;
}
