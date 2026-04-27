import { readFile } from 'node:fs/promises';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { SEARCH_INDEX_PATH, type SearchIndexEntry } from './search-index';

export type ServerMatch = {
  entry: SearchIndexEntry;
  fields: Record<string, Array<readonly [number, number]>>;
};

const FUSE_OPTIONS: IFuseOptions<SearchIndexEntry> = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'excerpt', weight: 0.25 },
    { name: 'tags', weight: 0.15 },
    { name: 'category', weight: 0.1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeMatches: true,
};

let cached: { fuse: Fuse<SearchIndexEntry>; entries: SearchIndexEntry[] } | null = null;

async function load(): Promise<NonNullable<typeof cached>> {
  if (cached) return cached;
  const json = await readFile(SEARCH_INDEX_PATH, 'utf8');
  const entries = JSON.parse(json) as SearchIndexEntry[];
  cached = { fuse: new Fuse(entries, FUSE_OPTIONS), entries };
  return cached;
}

export async function searchOnServer(query: string): Promise<ServerMatch[]> {
  if (!query.trim()) return [];
  const { fuse } = await load();
  const hits = fuse.search(query);
  return hits.map((h) => ({
    entry: h.item,
    fields: indexMatchesByField(h.matches),
  }));
}

function indexMatchesByField(
  matches:
    | readonly { key?: string; indices: readonly (readonly [number, number])[] }[]
    | undefined,
): Record<string, Array<readonly [number, number]>> {
  const out: Record<string, Array<readonly [number, number]>> = {};
  if (!matches) return out;
  for (const m of matches) {
    if (!m.key) continue;
    out[m.key] = (out[m.key] ?? []).concat(
      m.indices.map(([s, e]) => [s, e] as const),
    );
  }
  return out;
}
