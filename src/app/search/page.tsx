import { Sidebar } from '@/components/Sidebar';
import { SearchResults } from '@/components/SearchResults';
import { searchOnServer } from '@/lib/search-server';
import { FilterChips, type ActiveFilter } from '@/components/FilterChips';

export const metadata = {
  title: 'Search',
  description: 'Search posts on Omni-Verse Blog',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const trimmed = q.trim();
  const matches = trimmed ? await searchOnServer(trimmed) : [];

  const baseParams = new URLSearchParams();
  if (trimmed) baseParams.set('q', trimmed);
  const active: ActiveFilter[] = trimmed
    ? [{ type: 'q', value: trimmed, label: `“${trimmed}”` }]
    : [];

  return (
    <div className="layout-with-sidebar">
      <Sidebar />
      <div>
        <div className="listing-toolbar">
          <FilterChips active={active} basePath="/search" baseParams={baseParams} />
        </div>
        <SearchResults query={trimmed} matches={matches} />
      </div>
    </div>
  );
}
