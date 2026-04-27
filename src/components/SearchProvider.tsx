'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { SearchIndexEntry } from '@/lib/search-index';

type SearchState = {
  query: string;
  setQuery: (q: string) => void;
  matchedSlugs: Set<string> | null; // null when query is empty
};

const Ctx = createContext<SearchState | null>(null);

const FUSE_OPTIONS: IFuseOptions<SearchIndexEntry> = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'excerpt', weight: 0.25 },
    { name: 'tags', weight: 0.15 },
    { name: 'category', weight: 0.1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeMatches: false,
};

export function SearchProvider({
  initialQuery,
  children,
}: {
  initialQuery?: string;
  children: React.ReactNode;
}) {
  const [query, setQueryState] = useState(initialQuery ?? '');
  const [index, setIndex] = useState<SearchIndexEntry[] | null>(null);
  const fuseRef = useRef<Fuse<SearchIndexEntry> | null>(null);

  const ensureIndex = useCallback(async () => {
    if (index) return;
    try {
      const res = await fetch('/api/search-index.json', { cache: 'force-cache' });
      const data = (await res.json()) as SearchIndexEntry[];
      setIndex(data);
      fuseRef.current = new Fuse(data, FUSE_OPTIONS);
    } catch {
      setIndex([]);
      fuseRef.current = new Fuse<SearchIndexEntry>([], FUSE_OPTIONS);
    }
  }, [index]);

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);
      if (q.trim() !== '') void ensureIndex();
    },
    [ensureIndex],
  );

  const matchedSlugs = useMemo<Set<string> | null>(() => {
    void index; // depend on index loading so the memo recomputes once fuse is ready
    const q = query.trim();
    if (q === '') return null;
    if (!fuseRef.current) return new Set();
    const hits = fuseRef.current.search(q);
    return new Set(hits.map((h) => h.item.slug));
  }, [query, index]);

  // Reflect query in URL ?q=
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const current = url.searchParams.get('q') ?? '';
    if (query === current) return;
    if (query === '') url.searchParams.delete('q');
    else url.searchParams.set('q', query);
    window.history.replaceState(null, '', url.toString());
  }, [query]);

  // Read URL ?q= on mount (if no initialQuery passed)
  useEffect(() => {
    if (initialQuery !== undefined) return;
    if (typeof window === 'undefined') return;
    const q = new URL(window.location.href).searchParams.get('q');
    if (q) setQuery(q);
  }, [initialQuery, setQuery]);

  return <Ctx.Provider value={{ query, setQuery, matchedSlugs }}>{children}</Ctx.Provider>;
}

export function useSearch(): SearchState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSearch must be called inside <SearchProvider>');
  return v;
}
