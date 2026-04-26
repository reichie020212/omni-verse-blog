# Omni-Verse Blog — Phase 2 Design

**Status:** Approved (brainstorm), pending implementation plan
**Date:** 2026-04-26
**Author:** Red + Claude
**Builds on:** Phase 1 — `docs/superpowers/specs/2026-04-26-omni-verse-blog-phase-1-design.md` (merged at `cb06783` on `main`)

## 1. Scope

Phase 2 layers reading-experience polish on top of the Phase 1 static blog. No database, no auth, no server actions. Output is still fully statically generated; new client islands only where genuinely interactive.

Phase 2 covers:

1. **Drawer routing** — clicking a post card from any listing opens the article in an overlay drawer (intercepting route + parallel slot). Direct visits and refresh inside the drawer fall through to the regular full-page view.
2. **Reading progress bar** — thin accent-colored bar pinned to the top of the viewport, fills as the article body scrolls.
3. **Related posts** — three ranked posts at the bottom of every article, scored by tag overlap with same-category tiebreak.
4. **Toasts + share button** — copy-link button in the article header that shows a "Link copied" toast.
5. **Sort dropdown** — `?sort=oldest` toggle on the listings; `newest` is default. "Popular" is deferred to Phase 3 (needs DB).
6. **Active-filter chips** — server-rendered chips at the top of `/`, `/category/[id]`, `/tag/[name]`, and `/search` that visualize active filters and link to remove them.
7. **Dedicated `/search?q=…` page** — full search results page with `<mark>`-highlighted matches in title and excerpt, separate from the topbar live filter.

What stays out: drawer-from-search-results (search uses full pages), comments / likes / bookmarks / sign-in (Phase 3), `pnpm new-post` CLI / OG / sitemap / RSS / Lighthouse target / Playwright (Phase 4).

## 2. File structure

### New files

```
src/
├── app/
│   ├── @drawer/
│   │   ├── default.tsx                          ← null fallback
│   │   └── (.)posts/[slug]/page.tsx             ← intercepted post → drawer
│   └── search/
│       └── page.tsx                             ← /search?q=…
├── components/
│   ├── PostDrawer.tsx                           ← <dialog> wrapper (client)
│   ├── ReadingProgress.tsx                      ← top-of-viewport bar (client)
│   ├── RelatedPosts.tsx                         ← server, ranked
│   ├── ShareButton.tsx                          ← copy-link → toast (client)
│   ├── Toast.tsx                                ← toast surface (client)
│   ├── ToastProvider.tsx                        ← context (client)
│   ├── SortDropdown.tsx                         ← URL-driven select (client)
│   ├── FilterChips.tsx                          ← server, URL-aware
│   └── SearchResults.tsx                        ← /search render (server)
└── lib/
    ├── related.ts                               ← rankRelated()
    ├── related.test.ts
    ├── highlight.ts                             ← string + match indices → React nodes
    └── highlight.test.ts
```

### Modified files

| File | Change |
|---|---|
| `src/app/layout.tsx` | Accept `drawer` slot prop; mount `<ToastProvider>` and `<ReadingProgress>` in shell. |
| `src/app/posts/[slug]/page.tsx` | Add `<RelatedPosts>` and `<ShareButton>` to the article. |
| `src/app/page.tsx` | Add `<FilterChips>` + `<SortDropdown>`; honor `?sort=oldest`. |
| `src/app/category/[id]/page.tsx` | Same: chips + sort + `?sort=oldest`. |
| `src/app/tag/[name]/page.tsx` | Same. |
| `src/components/SearchInput.tsx` | Pressing Enter on non-empty query navigates to `/search?q=…`. |
| `src/lib/posts.ts` | Add `applySort(posts, sort)` helper; export `Sort = 'newest' \| 'oldest'`. |
| `src/styles/globals.css` | New rules for drawer + reading progress + filter chips + sort dropdown + search results. |

No new dependencies.

## 3. Architecture

Stack unchanged from Phase 1. Phase 2 adds three RSC pages (`@drawer/default`, `@drawer/(.)posts/[slug]`, `/search`) and seven client islands (`PostDrawer`, `ReadingProgress`, `ShareButton`, `Toast`, `ToastProvider`, `SortDropdown` plus the existing `SearchProvider`/`SearchInput`/`FilteredGrid`/`ThemeToggle` from Phase 1). All listing and article pages remain server-rendered.

### Rendering model

The root layout now declares two slots: `children` (the routed page) and `drawer` (a parallel-route slot). For most URLs the `drawer` slot resolves to `@drawer/default.tsx` and renders nothing. When in-app navigation hits `/posts/<slug>`, Next intercepts via `@drawer/(.)posts/[slug]/page.tsx` and renders the post inside `<PostDrawer>` while keeping the originating page mounted in `children`.

Refresh on `/posts/<slug>` skips the intercept (the URL no longer counts as "intercepted from the same segment") and falls through to the regular `src/app/posts/[slug]/page.tsx`. Direct external links → same.

### Component boundaries

| Component | Type | Responsibility |
|---|---|---|
| `<PostDrawer>` | client | Wraps a native `<dialog>` with slide-in transition, backdrop blur, Esc + backdrop-click close, scroll-lock (native to `<dialog>`). |
| `<ReadingProgress>` | client | Fixed bar at the top of the viewport. Listens to scroll on the article container; writes `--progress` CSS var. Active only when the URL matches `/posts/<slug>`. |
| `<RelatedPosts>` | server | Calls `rankRelated(current, all)` → up to 3 posts. Renders compact related-card layout. |
| `<ShareButton>` | client | `navigator.share` on touch, `navigator.clipboard.writeText` otherwise; on success calls `toast.show("Link copied")`. |
| `<ToastProvider>` + `<Toast>` | client | One global toast slot; latest message replaces previous. 2.2s lifetime. |
| `<SortDropdown>` | client | Real `<select>`; `onChange` calls `router.replace` with updated `?sort`. |
| `<FilterChips>` | server | Reads URL params from props; renders one chip per active filter, each as an `<a>` to the same path with that param removed. |
| `<SearchResults>` | server | Receives query + match index; renders vertical list with `<mark>` highlights. |

## 4. Drawer routing

### Layout signature

```tsx
export default function RootLayout({
  children,
  drawer,
}: {
  children: React.ReactNode;
  drawer: React.ReactNode;
}) {
  return (
    <html …>
      <body>
        <SearchProvider>
          <Topbar />
          <main id="main">{children}</main>
          {drawer}
          <ReadingProgress />
          <ToastProvider>
            <Toast />
          </ToastProvider>
        </SearchProvider>
      </body>
    </html>
  );
}
```

### Intercepted route

```tsx
// src/app/@drawer/(.)posts/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/posts';
import { PostDrawer } from '@/components/PostDrawer';
import { ArticleHeader } from '@/components/ArticleHeader';
import { ArticleBody } from '@/components/ArticleBody';
import { ArticleFooter } from '@/components/ArticleFooter';
import { RelatedPosts } from '@/components/RelatedPosts';

export default async function InterceptedPost({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  return (
    <PostDrawer slug={post.slug}>
      <article className="article">
        <ArticleHeader post={post} />
        <ArticleBody source={post.body} />
        <ArticleFooter post={post} />
        <RelatedPosts post={post} />
      </article>
    </PostDrawer>
  );
}
```

The article components are reused as-is from Phase 1.

### `<PostDrawer>` (client)

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function PostDrawer({ slug, children }: { slug: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, [slug]);

  function close() {
    ref.current?.close();
    router.back();
  }

  return (
    <dialog
      ref={ref}
      className="post-drawer"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === ref.current) close(); }}
    >
      <button type="button" className="drawer-close" onClick={close} aria-label="Close article">
        ×
      </button>
      <div className="drawer-content">{children}</div>
    </dialog>
  );
}
```

Native `<dialog>` provides focus trap, scroll-lock, and Esc handling. Backdrop click is detected via `e.target === ref.current` (the dialog catches its own backdrop clicks).

### CSS (drawer + backdrop, modern open/close transition)

```css
.post-drawer {
  margin: 0 0 0 auto;
  height: 100vh;
  width: min(720px, 100vw);
  border: 0;
  background: var(--bg);
  color: var(--fg);
  padding: 0;
  overflow: auto;
  transform: translateX(100%);
  transition:
    transform 280ms cubic-bezier(0.32, 0.72, 0, 1),
    overlay 280ms ease allow-discrete,
    display 280ms ease allow-discrete;
}
.post-drawer[open] { transform: translateX(0); }

.post-drawer::backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 280ms ease, overlay 280ms ease allow-discrete, display 280ms ease allow-discrete;
}
.post-drawer[open]::backdrop { opacity: 1; }

@starting-style {
  .post-drawer[open]            { transform: translateX(100%); }
  .post-drawer[open]::backdrop  { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .post-drawer,
  .post-drawer::backdrop {
    transition: opacity 120ms ease, overlay 120ms ease allow-discrete, display 120ms ease allow-discrete;
    transform: none;
  }
  @starting-style {
    .post-drawer[open]            { transform: none; opacity: 0; }
    .post-drawer[open]::backdrop  { opacity: 0; }
  }
}
```

`@starting-style` plus `transition-behavior: allow-discrete` is the modern CSS pattern for animating native `<dialog>` open/close (Chromium 117+, Safari 17.4+, Firefox 129+ — all current as of 2026).

### Navigation behavior

| User action | URL | What renders |
|---|---|---|
| Click card on `/` | `/posts/<slug>` | `/` (children) + drawer |
| Click another card while drawer is open | `/posts/<other>` | `/` + new article in drawer (content swap) |
| `×` / Esc / backdrop click | `/` | `/` only (slot null) |
| Tag/category chip inside drawer | `/tag/<name>` etc | listing; drawer unmounts (no close transition — acceptable) |
| Refresh on `/posts/<slug>` | same | full page (no intercept) |
| Direct external link | same | full page |
| Browser back | previous URL | native back |

## 5. Reading progress

```tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function ReadingProgress() {
  const pathname = usePathname();
  const isPost = pathname?.startsWith('/posts/') ?? false;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPost) {
      setProgress(0);
      return;
    }
    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [isPost, pathname]);

  if (!isPost) return null;
  return <div className="reading-progress" style={{ ['--progress' as string]: progress }} />;
}
```

CSS: `.reading-progress { position: fixed; top: 0; left: 0; height: 3px; background: var(--accent); width: calc(var(--progress, 0) * 100%); transition: width 60ms linear; z-index: 60 } @media (prefers-reduced-motion: reduce) { .reading-progress { transition: none } }`.

When the post is open in the drawer, the drawer is the scroller (the body is scroll-locked by `<dialog>`). The component picks the right scroller per render:

```tsx
function getScroller(): HTMLElement | Window {
  return document.querySelector<HTMLDialogElement>('dialog.post-drawer[open]') ?? window;
}
```

Re-evaluated whenever a `MutationObserver` on `body` sees a `dialog.post-drawer` open/close attribute change. The listener attaches/detaches to the resolved scroller; the progress fraction is computed from `el.scrollTop / (el.scrollHeight - el.clientHeight)` for an element, or the existing `window.scrollY / (documentElement.scrollHeight - innerHeight)` for the window case.

## 6. Related posts

```ts
// src/lib/related.ts
import type { Post } from './posts';

export function rankRelated(current: Post, all: Post[], limit = 3): Post[] {
  return all
    .filter((p) => p.slug !== current.slug && !p.draft)
    .map((p) => {
      const tagOverlap = p.tags.filter((t) => current.tags.includes(t)).length;
      const sameCategory = p.category === current.category ? 1 : 0;
      const score = tagOverlap * 2 + sameCategory;
      return { post: p, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map(({ post }) => post);
}
```

`<RelatedPosts post={post}>` calls `getAllPosts()`, runs `rankRelated`, renders up to 3 compact cards (title + cover + date, no excerpt). If empty, renders nothing.

Tested: tag-overlap weighting beats category-only; tie-break by date desc; current post excluded; drafts excluded; empty result returns `[]`.

## 7. Sort + filter chips

### Sort

`Sort = 'newest' | 'oldest'`. URL: `?sort=oldest` (newest is default and absent). `<SortDropdown>` is a real `<select>` whose `onChange` calls `router.replace` with the updated query string.

`applySort(posts, sort)` reverses for `oldest`. Lives in `src/lib/posts.ts`. The listing pages call it after `getAllPosts()` / `getPostsByCategory(id)` / `getPostsByTag(name)`.

### Filter chips

`<FilterChips>` receives an object describing active filters and renders one chip per. Server component, no client JS.

```tsx
// src/components/FilterChips.tsx
type Active =
  | { type: 'category'; value: string }
  | { type: 'tag'; value: string }
  | { type: 'q'; value: string }
  | { type: 'sort'; value: 'oldest' };

export function FilterChips({ active, basePath }: { active: Active[]; basePath: string }) {
  if (active.length === 0) return null;
  return (
    <ul className="filter-chips">
      {active.map((a) => {
        const removeHref = removalHref(basePath, active, a);
        return (
          <li key={`${a.type}-${a.value}`}>
            <a className="filter-chip" href={removeHref}>
              {labelFor(a)} <span aria-hidden="true">×</span>
              <span className="visually-hidden">remove {labelFor(a)} filter</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
```

Each listing page builds the `active` array from its route params + URL search params. The chip's `href` is a recomputed URL with that one filter removed.

## 8. Toast + share

### `<ToastProvider>` + `<Toast>`

Single global slot. `useToast()` hook returns `{ show: (msg: string) => void }`. State is one slot — newer messages replace older. `<Toast>` is fixed at `bottom: 24px; left: 50%; transform: translateX(-50%)`. Fade in / fade out, 2.2s lifetime. `prefers-reduced-motion` → no fade.

### `<ShareButton>`

```tsx
'use client';

import { useToast } from './ToastProvider';

export function ShareButton({ url, title }: { url: string; title: string }) {
  const toast = useToast();
  async function share() {
    const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
    try {
      if (canShare) await navigator.share({ url, title });
      else await navigator.clipboard.writeText(url);
      toast.show('Link copied');
    } catch {
      // user-cancelled (web share) or denied — silent
    }
  }
  return (
    <button type="button" className="share-button" onClick={share} aria-label="Share article">
      Share
    </button>
  );
}
```

Lives in `<ArticleHeader>`. When in the drawer, the share URL is `window.location.href` at click time (which is the article's canonical `/posts/<slug>` URL).

## 9. `/search?q=…` page

```tsx
// src/app/search/page.tsx
import { SearchResults } from '@/components/SearchResults';
import { searchOnServer } from '@/lib/search-server';

export const metadata = { title: 'Search — Omni-Verse Blog' };

export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const trimmed = q.trim();
  if (!trimmed) return <SearchResults query="" results={[]} />;
  const results = await searchOnServer(trimmed);
  return <SearchResults query={trimmed} results={results} />;
}
```

`searchOnServer(q)` lives in `src/lib/search-server.ts`. It reads the build-time `public/search-index.json` directly from disk (server-side, no `fetch`), runs Fuse over it, returns matches with character indices (Fuse `includeMatches: true`).

`<SearchResults>`:

- Empty `query` → "Type something in the topbar to search."
- Results found → "N results for `<q>`" + vertical list of cards (cover thumb, title, excerpt, tags, category, date). Title and excerpt highlighted via `<mark>` using `highlight()` from `src/lib/highlight.ts`.
- No results → "No posts match `<q>`."

`<FilterChips>` on the search page shows a single `q: <query>` chip whose remove-link is `/`.

`<SearchInput>`'s topbar behavior: live-filter on `/`, `/category/<id>`, `/tag/<name>` (existing). Pressing Enter on a non-empty query → `router.push('/search?q=…')`.

## 10. Highlight utility

```ts
// src/lib/highlight.ts
import type { ReactNode } from 'react';
import { Fragment } from 'react';

export type Range = readonly [number, number]; // inclusive start, inclusive end

export function highlight(text: string, ranges: readonly Range[]): ReactNode {
  if (ranges.length === 0) return text;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let cursor = 0;
  sorted.forEach(([start, end], i) => {
    if (start > cursor) out.push(<Fragment key={`t${i}`}>{text.slice(cursor, start)}</Fragment>);
    out.push(<mark key={`m${i}`}>{text.slice(start, end + 1)}</mark>);
    cursor = end + 1;
  });
  if (cursor < text.length) out.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  return out;
}
```

Tested: empty ranges → text unchanged; single range; multiple non-overlapping; full-string match; range at the end of the string.

## 11. Testing additions

| Suite | Coverage |
|---|---|
| `related.test.ts` | rankRelated: tag-overlap weighting, same-category tiebreak, draft exclusion, empty result, deterministic ordering |
| `highlight.test.ts` | highlight: empty / single / multiple non-overlapping / full-string / end-of-string ranges |
| `posts.test.ts` extension | `applySort('oldest')` reverses order; `applySort('newest')` is a no-op |

Playwright stays deferred to Phase 4. Manual smoke checklist: drawer open / drawer swap / drawer close (×, Esc, backdrop, route-back); reading progress correct on full page and inside drawer; share button copies URL and toast appears; sort persists in URL across reloads; filter chips remove correctly; `/search?q=` shows results with highlights.

## 12. Error handling

- Drawer for missing slug → `notFound()` inside slot; layout still renders, drawer surfaces 404 content. Rare since cards link to known slugs.
- `/search?q=` empty → empty state, no error.
- Reading progress listener cleanup verified in `useEffect` return.
- Toast on `navigator.share` user-cancel → silent (no error toast). Same for clipboard denial.
- All else falls back to Phase 1's error handling (Zod build-time validation, themed 404, no `try/catch` around content reads).

## 13. Acceptance criteria for Phase 2

- Click any card from `/`, `/category/<id>`, `/tag/<name>`, `/search?q=…` → drawer slides in, URL updates, originating page stays mounted underneath.
- Esc / × / backdrop click closes drawer; URL returns to the originating page.
- Refresh while drawer is open → renders the full `/posts/<slug>` page, identical to direct external link.
- Reading progress bar fills correctly while scrolling the article in both full-page and drawer modes.
- Each article shows up to 3 related posts at the bottom; ordering matches the rankRelated algorithm.
- Share button copies the canonical URL; toast appears with "Link copied".
- `?sort=oldest` reverses every listing; selection persists across reloads.
- Active-filter chips appear above the grid on `/`, `/category/<id>`, `/tag/<name>`, `/search` whenever any filter is active; clicking a chip removes only that filter.
- `/search?q=…` renders a vertical list with `<mark>`-highlighted matches in title and excerpt; empty `q` shows the empty state; `/search` (no `q`) does the same.
- `prefers-reduced-motion: reduce` disables drawer slide (fades only), reading-progress transition, and toast fade.
- `pnpm validate` and `pnpm build` are green.

When all of the above hold, Phase 2 is done and we move to Phase 3 (auth + DB + interactions).
