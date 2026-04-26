import Link from 'next/link';

export type ActiveFilter =
  | { type: 'category'; value: string; label: string }
  | { type: 'tag'; value: string; label: string }
  | { type: 'q'; value: string; label: string }
  | { type: 'sort'; value: 'oldest'; label: string };

export function FilterChips({
  active,
  basePath,
  baseParams,
}: {
  active: ActiveFilter[];
  basePath: string;
  baseParams: URLSearchParams;
}) {
  if (active.length === 0) return null;
  return (
    <ul className="filter-chips" aria-label="Active filters">
      {active.map((a) => {
        const href = removalHref(a, basePath, baseParams);
        return (
          <li key={`${a.type}-${a.value}`}>
            <Link className="filter-chip" href={href}>
              <span>{a.label}</span>
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">remove {a.label} filter</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function removalHref(
  filter: ActiveFilter,
  basePath: string,
  baseParams: URLSearchParams,
): string {
  const sp = new URLSearchParams(baseParams);
  if (filter.type === 'q') sp.delete('q');
  if (filter.type === 'sort') sp.delete('sort');
  let path = basePath;
  if (filter.type === 'category' || filter.type === 'tag') path = '/';
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
