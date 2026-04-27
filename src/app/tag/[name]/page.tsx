import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { applySort, getAllPosts, getPostsByTag, type Sort } from '@/lib/posts';
import { FilteredGrid } from '@/components/FilteredGrid';
import { FilterChips, type ActiveFilter } from '@/components/FilterChips';
import { SortDropdown } from '@/components/SortDropdown';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  const tags = new Set<string>();
  for (const p of posts) for (const t of p.tags) tags.add(t);
  return [...tags].map((name) => ({ name }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return { title: `#${name}`, description: `Posts tagged #${name}` };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { name } = await params;
  const sp = await searchParams;
  const sort: Sort = sp.sort === 'oldest' ? 'oldest' : 'newest';
  const posts = applySort(await getPostsByTag(name), sort);
  if (posts.length === 0) notFound();

  const baseParams = new URLSearchParams();
  if (sort === 'oldest') baseParams.set('sort', 'oldest');

  const active: ActiveFilter[] = [
    { type: 'tag', value: name, label: `#${name}` },
  ];
  if (sort === 'oldest') active.push({ type: 'sort', value: 'oldest', label: 'oldest first' });

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
        <div className="listing-toolbar">
          <FilterChips active={active} basePath={`/tag/${name}`} baseParams={baseParams} />
          <SortDropdown current={sort} />
        </div>
        <FilteredGrid posts={posts} />
      </section>
    </div>
  );
}
