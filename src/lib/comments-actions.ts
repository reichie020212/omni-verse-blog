'use server';

import { auth } from './auth';
import { db } from './db';
import { revalidatePath } from 'next/cache';
import {
  addCommentImpl,
  deleteCommentImpl,
  listCommentsImpl,
  type CommentRow,
} from './comments';

export async function addComment(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('not signed in');
  const slug = String(formData.get('slug') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  await addCommentImpl(db, session.user.id, slug, body);
  revalidatePath(`/posts/${slug}`);
}

export async function deleteComment(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('not signed in');
  const id = String(formData.get('id') ?? '');
  const slug = String(formData.get('slug') ?? '');
  await deleteCommentImpl(db, session.user.id, id);
  if (slug) revalidatePath(`/posts/${slug}`);
}

export async function listComments(slug: string): Promise<CommentRow[]> {
  return listCommentsImpl(db, slug);
}
