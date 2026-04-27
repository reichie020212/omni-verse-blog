'use client';

import { useEffect, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from './SearchProvider';

export function SearchInput() {
  const { query, setQuery } = useSearch();
  const ref = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA'
      ) {
        e.preventDefault();
        ref.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === ref.current) {
        setQuery('');
        ref.current?.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setQuery]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const hasQuery = query.length > 0;

  return (
    <form className="search-wrap" onSubmit={onSubmit} role="search">
      <label htmlFor={labelId} className="visually-hidden">
        Search posts
      </label>
      <span className="search-icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        id={labelId}
        ref={ref}
        type="search"
        className="search"
        placeholder="search posts, tags, or topics…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {hasQuery ? (
        <button
          type="button"
          className="search-clear"
          onClick={() => {
            setQuery('');
            ref.current?.focus();
          }}
          aria-label="Clear search"
        >
          ✕
        </button>
      ) : (
        <span className="search-kbd" aria-hidden="true">
          /
        </span>
      )}
    </form>
  );
}
