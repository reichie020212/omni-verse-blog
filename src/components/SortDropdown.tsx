'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Sort } from '@/lib/posts';

export function SortDropdown({ current }: { current: Sort }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Sort;
    const sp = new URLSearchParams(params?.toString() ?? '');
    if (next === 'newest') sp.delete('sort');
    else sp.set('sort', next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="sort-dropdown">
      <span className="visually-hidden">Sort posts</span>
      <select value={current} onChange={onChange}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </label>
  );
}
