import { notFound } from 'next/navigation';
import { CATEGORIES, isKnownCategory, categoryById } from '@/lib/categories';
import { getPostsByCategory } from '@/lib/posts';
import { Sidebar } from '@/components/Sidebar';
import { FilteredGrid } from '@/components/FilteredGrid';

export async function generateStaticParams() {
  return CATEGORIES.filter((c) => c.id !== 'all').map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = categoryById(id);
  return cat
    ? { title: `${cat.label} — Omni-Verse Blog`, description: `Posts in ${cat.label}` }
    : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isKnownCategory(id) || id === 'all') notFound();
  const posts = await getPostsByCategory(id);
  return (
    <div className="layout-with-sidebar">
      <Sidebar activeCategory={id} />
      <section>
        <header className="listing-header">
          <h1>{categoryById(id)?.label}</h1>
          <p>
            {posts.length} post{posts.length === 1 ? '' : 's'}
          </p>
        </header>
        <FilteredGrid posts={posts} />
      </section>
    </div>
  );
}
