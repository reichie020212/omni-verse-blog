import path from 'node:path';
import { eq } from 'drizzle-orm';
import { loadPostsFromDir, type Post } from '../src/lib/posts';
import { bootstrapAdmin } from '../src/lib/bootstrap-admin';
import { db } from '../src/lib/db';
import { env } from '../src/lib/env';
import { posts as postsTable, users } from '../src/lib/schema';
import { regenerateSearchIndex } from '../src/lib/search-index';

type PostRow = typeof postsTable.$inferSelect;

function rowMatchesPost(row: PostRow, post: Post): boolean {
  return (
    row.id === post.id &&
    row.title === post.title &&
    row.excerpt === post.excerpt &&
    row.body === post.body &&
    row.category === post.category &&
    row.date === post.date &&
    row.readTime === post.readTime &&
    row.size === post.size &&
    row.cover === post.cover &&
    row.featured === post.featured &&
    row.draft === post.draft &&
    JSON.stringify(row.tags) === JSON.stringify(post.tags)
  );
}

async function main(): Promise<void> {
  if (!env.ADMIN_USERNAME) {
    throw new Error('ADMIN_USERNAME must be set so migrated posts have an author');
  }

  await bootstrapAdmin();
  const adminUsername = env.ADMIN_USERNAME.toLowerCase();
  const author = await db.query.users.findFirst({
    where: eq(users.username, adminUsername),
  });
  if (!author) {
    throw new Error(
      `bootstrapAdmin did not produce a user for ADMIN_USERNAME=${adminUsername}`,
    );
  }

  const dir = path.join(process.cwd(), 'content', 'posts');
  const posts = await loadPostsFromDir(dir, { includeDrafts: true });

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    const existing = await db.query.posts.findFirst({
      where: eq(postsTable.slug, post.slug),
    });

    if (existing && rowMatchesPost(existing, post)) {
      skipped++;
      continue;
    }

    const values = {
      slug: post.slug,
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      category: post.category,
      tags: post.tags,
      date: post.date,
      readTime: post.readTime,
      size: post.size,
      cover: post.cover,
      featured: post.featured,
      draft: post.draft,
      authorId: author.id,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(postsTable).set(values).where(eq(postsTable.slug, post.slug));
      updated++;
    } else {
      await db.insert(postsTable).values(values);
      inserted++;
    }
  }

  console.log(
    `Migrated ${posts.length} post(s): ${inserted} inserted, ${updated} updated, ${skipped} unchanged.`,
  );

  const indexCount = await regenerateSearchIndex(db);
  console.log(`Regenerated data/search-index.json (${indexCount} entries).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
