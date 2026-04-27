'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from './auth';
import { db } from './db';
import {
  upsertPostImpl,
  deletePostImpl,
  setCoverImageImpl,
  clearCoverImageImpl,
} from './posts-admin';
import { regenerateSearchIndex } from './search-index';

async function ensureAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    throw new Error('forbidden');
  }
  return { userId: session.user.id };
}

function parseFormData(fd: FormData): Record<string, unknown> {
  return {
    slug: fd.get('slug'),
    title: fd.get('title'),
    excerpt: fd.get('excerpt'),
    body: fd.get('body'),
    category: fd.get('category'),
    tags: String(fd.get('tags') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    date: fd.get('date'),
    readTime: Number(fd.get('readTime') ?? 0),
    size: fd.get('size'),
    cover: fd.get('cover'),
    featured: fd.get('featured') === 'on',
    draft: fd.get('draft') === 'on',
  };
}

function revalidateForPost(slug: string, category: string, tags: string[]): void {
  revalidatePath('/');
  revalidatePath('/posts');
  revalidatePath(`/posts/${slug}`);
  revalidatePath(`/category/${category}`);
  for (const tag of tags) revalidatePath(`/tag/${tag}`);
}

export async function upsertPostAction(formData: FormData): Promise<void> {
  const { userId } = await ensureAdmin();
  const raw = parseFormData(formData);
  const { slug } = await upsertPostImpl(db, userId, raw);

  const removeCoverImage = formData.get('removeCoverImage') === 'on';
  const coverImage = formData.get('coverImage');
  if (coverImage instanceof File && coverImage.size > 0) {
    const buf = Buffer.from(await coverImage.arrayBuffer());
    await setCoverImageImpl(db, slug, buf, coverImage.type);
  } else if (removeCoverImage) {
    await clearCoverImageImpl(db, slug);
  }

  await regenerateSearchIndex(db);
  revalidateForPost(
    slug,
    String(raw.category ?? ''),
    Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
  );
  redirect('/admin/posts');
}

export async function deletePostAction(formData: FormData): Promise<void> {
  await ensureAdmin();
  const slug = String(formData.get('slug') ?? '');
  if (!slug) throw new Error('slug required');
  await deletePostImpl(db, slug);
  await regenerateSearchIndex(db);
  revalidatePath('/');
  revalidatePath('/posts');
  revalidatePath(`/posts/${slug}`);
  redirect('/admin/posts');
}
