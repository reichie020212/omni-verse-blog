'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Sort } from '@/lib/posts';

const OPTIONS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'newest' },
  { value: 'oldest', label: 'oldest' },
];

export function SortDropdown({ current }: { current: Sort }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const params = useSearchParams();

  function setSort(next: Sort) {
    const sp = new URLSearchParams(params?.toString() ?? '');
    if (next === 'newest') sp.delete('sort');
    else sp.set('sort', next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="sort-bar" role="radiogroup" aria-label="Sort posts">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className="sort-btn"
          data-active={current === o.value ? 'true' : undefined}
          aria-checked={current === o.value}
          role="radio"
          onClick={() => setSort(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
