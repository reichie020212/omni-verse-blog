import Link from 'next/link';
import { db } from '@/lib/db';
import { getAllPostsImpl } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export default async function AdminPostsListPage() {
  const posts = await getAllPostsImpl(db, { includeDrafts: true });
  return (
    <main className="admin-shell" style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>Posts</h1>
        <Link href="/admin/posts/new">+ New post</Link>
      </header>
      <table style={{ width: '100%', marginTop: '1.5rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
            <th style={{ padding: '0.5rem' }}>Title</th>
            <th style={{ padding: '0.5rem' }}>Slug</th>
            <th style={{ padding: '0.5rem' }}>Status</th>
            <th style={{ padding: '0.5rem' }}>Category</th>
            <th style={{ padding: '0.5rem' }}>Date</th>
            <th style={{ padding: '0.5rem' }} />
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: '1rem', opacity: 0.6 }}>
                No posts yet. <Link href="/admin/posts/new">Create one →</Link>
              </td>
            </tr>
          )}
          {posts.map((p) => (
            <tr key={p.slug} style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '0.5rem' }}>{p.title}</td>
              <td style={{ padding: '0.5rem', fontFamily: 'JetBrainsMono, monospace' }}>{p.slug}</td>
              <td style={{ padding: '0.5rem' }}>{p.draft ? 'draft' : 'published'}</td>
              <td style={{ padding: '0.5rem' }}>{p.category}</td>
              <td style={{ padding: '0.5rem' }}>{p.date}</td>
              <td style={{ padding: '0.5rem' }}>
                <Link href={`/admin/posts/${p.slug}/edit`}>Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
