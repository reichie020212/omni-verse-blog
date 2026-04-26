'use client';

import { useEffect, useRef, useId } from 'react';
import { useSearch } from './SearchProvider';

export function SearchInput() {
  const { query, setQuery } = useSearch();
  const ref = useRef<HTMLInputElement>(null);
  const labelId = useId();

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

  return (
    <div className="search-wrap">
      <label htmlFor={labelId} className="visually-hidden">
        Search posts
      </label>
      <input
        id={labelId}
        ref={ref}
        type="search"
        className="search-input"
        placeholder='Search posts… (press "/")'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
