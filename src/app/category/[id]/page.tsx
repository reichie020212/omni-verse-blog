import { notFound } from 'next/navigation';
import { CATEGORIES, isKnownCategory, categoryById } from '@/lib/categories';
import { applySort, getPostsByCategory, type Sort } from '@/lib/posts';
import { Sidebar } from '@/components/Sidebar';
import { FilteredGrid } from '@/components/FilteredGrid';
import { FilterChips, type ActiveFilter } from '@/components/FilterChips';
import { SortDropdown } from '@/components/SortDropdown';

export async function generateStaticParams() {
  return CATEGORIES.filter((c) => c.id !== 'all').map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cat = categoryById(id);
  return cat
    ? { title: `${cat.label} — Omni-Verse Blog`, description: `Posts in ${cat.label}` }
    : {};
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id } = await params;
  if (!isKnownCategory(id) || id === 'all') notFound();
  const sp = await searchParams;
  const sort: Sort = sp.sort === 'oldest' ? 'oldest' : 'newest';
  const posts = applySort(await getPostsByCategory(id), sort);

  const baseParams = new URLSearchParams();
  if (sort === 'oldest') baseParams.set('sort', 'oldest');

  const active: ActiveFilter[] = [
    { type: 'category', value: id, label: `category: ${id}` },
  ];
  if (sort === 'oldest') active.push({ type: 'sort', value: 'oldest', label: 'oldest first' });

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
        <div className="listing-toolbar">
          <FilterChips active={active} basePath={`/category/${id}`} baseParams={baseParams} />
          <SortDropdown current={sort} />
        </div>
        <FilteredGrid posts={posts} />
      </section>
    </div>
  );
}
