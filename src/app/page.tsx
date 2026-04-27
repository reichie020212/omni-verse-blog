import { Sidebar } from '@/components/Sidebar';
import { applySort, getAllPosts, type Sort } from '@/lib/posts';
import { FilteredGrid } from '@/components/FilteredGrid';
import { FilterChips, type ActiveFilter } from '@/components/FilterChips';
import { SortDropdown } from '@/components/SortDropdown';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  const params = await searchParams;
  const sort: Sort = params.sort === 'oldest' ? 'oldest' : 'newest';
  const posts = applySort(await getAllPosts(), sort);

  const baseParams = new URLSearchParams();
  if (sort === 'oldest') baseParams.set('sort', 'oldest');
  if (params.q) baseParams.set('q', params.q);

  const active: ActiveFilter[] = [];
  if (params.q) active.push({ type: 'q', value: params.q, label: `“${params.q}”` });
  if (sort === 'oldest') active.push({ type: 'sort', value: 'oldest', label: 'oldest first' });

  return (
    <div className="layout-with-sidebar">
      <Sidebar />
      <div>
        <div className="listing-toolbar">
          <FilterChips active={active} basePath="/" baseParams={baseParams} />
          <SortDropdown current={sort} />
        </div>
        <FilteredGrid posts={posts} />
      </div>
    </div>
  );
}
