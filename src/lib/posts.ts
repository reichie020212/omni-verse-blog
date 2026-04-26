import matter from 'gray-matter';
import { z } from 'zod';
import { CATEGORY_IDS } from './categories';

export const PostFrontmatterSchema = z.object({
  id: z.string().regex(/^0x[0-9a-f]{3}$/, 'id must be 0x followed by 3 hex digits'),
  title: z.string().min(1),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case alphanumerics'),
  excerpt: z.string().min(1),
  category: z.string().refine((v) => (CATEGORY_IDS as readonly string[]).includes(v), {
    message: `category must be one of: ${CATEGORY_IDS.join(', ')}`,
  }),
  tags: z.array(z.string().min(1)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be ISO YYYY-MM-DD'),
  readTime: z.number().int().positive(),
  size: z.enum(['hero', 'wide', 'medium', 'small']),
  cover: z.string().min(1),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
});

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;
export type Post = PostFrontmatter & { body: string };

export function parsePost(filename: string, source: string): Post {
  const expectedSlug = filename.replace(/\.mdx$/, '');
  const { data, content } = matter(source);
  const fm = PostFrontmatterSchema.parse(data);
  if (fm.slug !== expectedSlug) {
    throw new Error(
      `frontmatter slug "${fm.slug}" does not match filename "${filename}"`,
    );
  }
  return { ...fm, body: content };
}
