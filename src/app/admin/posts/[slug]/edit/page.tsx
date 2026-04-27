import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getPostBySlugImpl } from '@/lib/posts';
import { AdminPostForm } from '@/components/AdminPostForm';
import { deletePostAction } from '@/lib/posts-admin-actions';

export const dynamic = 'force-dynamic';

export default async function AdminPostEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlugImpl(db, slug, { includeDrafts: true });
  if (!post) notFound();

  return (
    <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>Edit: {post.title}</h1>
        <Link href={`/posts/${post.slug}`} target="_blank">
          View public →
        </Link>
      </header>

      <AdminPostForm initial={post} />

      <section style={{ marginTop: '3rem', borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
        <h2>Danger zone</h2>
        <form action={deletePostAction}>
          <input type="hidden" name="slug" value={post.slug} />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              background: '#3a1414',
              color: '#ff8a8a',
              border: '1px solid #5a1f1f',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Delete post (cannot be undone)
          </button>
        </form>
      </section>
    </main>
  );
}
