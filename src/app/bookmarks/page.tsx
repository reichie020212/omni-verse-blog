import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getMyBookmarkedSlugs } from '@/lib/bookmarks-actions';
import { getAllPosts } from '@/lib/posts';
import { Sidebar } from '@/components/Sidebar';
import { CardGrid } from '@/components/CardGrid';

export const metadata = {
  title: 'Bookmarks',
};

export default async function BookmarksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/bookmarks');
  const [slugs, all] = await Promise.all([getMyBookmarkedSlugs(), getAllPosts()]);
  const set = new Set(slugs);
  const posts = all.filter((p) => set.has(p.slug));
  return (
    <div className="layout-with-sidebar">
      <Sidebar />
      <section>
        <header className="listing-header">
          <h1>Bookmarks</h1>
          <p>
            {posts.length} post{posts.length === 1 ? '' : 's'}
          </p>
        </header>
        {posts.length === 0 ? (
          <p className="empty-state">
            No bookmarks yet — tap the bookmark icon on any post.
          </p>
        ) : (
          <CardGrid posts={posts} />
        )}
      </section>
    </div>
  );
}
