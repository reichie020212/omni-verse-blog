import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { getAllPosts, getPostsByTag } from '@/lib/posts';
import { FilteredGrid } from '@/components/FilteredGrid';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  const tags = new Set<string>();
  for (const p of posts) for (const t of p.tags) tags.add(t);
  return [...tags].map((name) => ({ name }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return { title: `#${name} — Omni-Verse Blog`, description: `Posts tagged #${name}` };
}

export default async function TagPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const posts = await getPostsByTag(name);
  if (posts.length === 0) notFound();
  return (
    <div className="layout-with-sidebar">
      <Sidebar activeTag={name} />
      <section>
        <header className="listing-header">
          <h1>#{name}</h1>
          <p>
            {posts.length} post{posts.length === 1 ? '' : 's'}
          </p>
        </header>
        <FilteredGrid posts={posts} />
      </section>
    </div>
  );
}
