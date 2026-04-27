import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { DB } from './db';
import { posts as postsTable } from './schema';
import { CATEGORY_IDS } from './categories';

export const PostInputSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case alphanumerics'),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  body: z.string().min(1),
  category: z.string().refine((v) => (CATEGORY_IDS as readonly string[]).includes(v), {
    message: `category must be one of: ${CATEGORY_IDS.join(', ')}`,
  }),
  tags: z.array(z.string().min(1)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be ISO YYYY-MM-DD'),
  readTime: z.number().int().positive(),
  size: z.enum(['hero', 'wide', 'medium', 'small']),
  cover: z.string().min(1),
  featured: z.boolean(),
  draft: z.boolean(),
});

export type PostInput = z.infer<typeof PostInputSchema>;

async function nextHexId(db: DB): Promise<string> {
  const rows = await db.select({ id: postsTable.id }).from(postsTable);
  const max = rows.reduce((m, r) => {
    const n = parseInt(r.id.slice(2), 16);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  const next = max + 1;
  if (next > 0xfff) {
    throw new Error('post id space exhausted (0xfff)');
  }
  return `0x${next.toString(16).padStart(3, '0')}`;
}

export async function upsertPostImpl(
  db: DB,
  authorId: string,
  raw: unknown,
): Promise<{ slug: string; created: boolean }> {
  const input = PostInputSchema.parse(raw);

  const existing = await db.query.posts.findFirst({
    where: eq(postsTable.slug, input.slug),
  });

  if (existing) {
    await db
      .update(postsTable)
      .set({
        title: input.title,
        excerpt: input.excerpt,
        body: input.body,
        category: input.category,
        tags: input.tags,
        date: input.date,
        readTime: input.readTime,
        size: input.size,
        cover: input.cover,
        featured: input.featured,
        draft: input.draft,
        updatedAt: new Date(),
      })
      .where(eq(postsTable.slug, input.slug));
    return { slug: input.slug, created: false };
  }

  const id = await nextHexId(db);
  await db.insert(postsTable).values({
    slug: input.slug,
    id,
    title: input.title,
    excerpt: input.excerpt,
    body: input.body,
    category: input.category,
    tags: input.tags,
    date: input.date,
    readTime: input.readTime,
    size: input.size,
    cover: input.cover,
    featured: input.featured,
    draft: input.draft,
    authorId,
    updatedAt: new Date(),
  });
  return { slug: input.slug, created: true };
}

export async function deletePostImpl(db: DB, slug: string): Promise<void> {
  await db.delete(postsTable).where(eq(postsTable.slug, slug));
}
