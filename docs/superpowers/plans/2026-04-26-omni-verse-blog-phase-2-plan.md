# Omni-Verse Blog — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layer reading-experience polish on top of the Phase 1 static blog — drawer routing, reading progress bar, related posts, copy-link toast, sort dropdown, active-filter chips, and a dedicated `/search?q=…` page.

**Architecture:** Pure Phase 1 deltas. Drawer is a Next.js parallel slot at `app/@drawer/` plus an intercepting route `(.)posts/[slug]`; the article page itself stays unchanged for direct visits. Reading progress + toast + share are small client islands. Related posts, sort, filter chips, and search results are server-rendered. No new dependencies; everything builds against the existing `package.json`.

**Tech Stack:** Next.js 15 (App Router, RSC), TypeScript strict, fuse.js (already installed), `@starting-style` + `transition-behavior: allow-discrete` for native `<dialog>` open/close animation.

**Source spec:** `docs/superpowers/specs/2026-04-26-omni-verse-blog-phase-2-design.md`
**Phase 1 baseline:** `cb06783` on `main` (Phase 1 merged).

---

## File structure

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
    ├── highlight.tsx                            ← string + match indices → React nodes
    ├── highlight.test.tsx
    └── search-server.ts                         ← server-side fuse search over search-index.json
```

### Modified files

- `src/app/layout.tsx` — accept `drawer` slot prop; mount `<ReadingProgress>` + `<ToastProvider>` + `<Toast>`.
- `src/app/posts/[slug]/page.tsx` — add `<RelatedPosts>` and `<ShareButton>`.
- `src/app/page.tsx` — add `<FilterChips>` + `<SortDropdown>`; honor `?sort=`.
- `src/app/category/[id]/page.tsx` — same.
- `src/app/tag/[name]/page.tsx` — same.
- `src/components/SearchInput.tsx` — Enter on non-empty `q` → `router.push('/search?q=…')`.
- `src/components/ArticleHeader.tsx` — render `<ShareButton>`.
- `src/lib/posts.ts` — export `Sort` type and `applySort()` helper.
- `src/lib/posts.test.ts` — test `applySort` round-trips.
- `src/styles/globals.css` — drawer, backdrop, reading-progress, toast, share-button, sort-dropdown, filter-chip, search-results rules.

No new dependencies.

---

## Conventions

- **Branch:** if subagent-driven execution is chosen, work happens in `../omni-verse-blog-phase-2` worktree on branch `phase-2-reading-polish`. If hybrid (Phase 1's path B), work happens directly on `main`. Default = hybrid.
- **Commits:** every commit signed-off and signed (`git commit -s -S -m "…"`). No `Co-Authored-By: Claude` trailers.
- **TDD where there's logic** — `related.ts`, `highlight.ts`, `applySort`. UI components and CSS get a typecheck + smoke check, no unit tests.
- **`pnpm validate`** must be green at every commit.
- **One commit per task.**

---

## Task 1: Drawer slot scaffold

**Files:**
- Create: `src/app/@drawer/default.tsx`
- Modify: `src/app/layout.tsx` (accept `drawer` slot prop, render alongside `children`)

- [ ] **Step 1: Create `src/app/@drawer/default.tsx`**

```tsx
export default function DrawerDefault() {
  return null;
}
```

- [ ] **Step 2: Modify `src/app/layout.tsx` to accept and render the slot**

Update the `RootLayout` signature and JSX:

```tsx
export default function RootLayout({
  children,
  drawer,
}: {
  children: React.ReactNode;
  drawer: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('ovb-theme');var t=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <SearchProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Topbar />
          <main id="main" className="main-content">
            {children}
          </main>
          {drawer}
        </SearchProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm build`
Expected: PASS. Build succeeds; routes unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/app/@drawer/default.tsx src/app/layout.tsx
git commit -s -S -m "feat(drawer): add @drawer parallel slot to root layout"
```

---

## Task 2: Intercepted post route + `<PostDrawer>` component + drawer CSS

**Files:**
- Create: `src/app/@drawer/(.)posts/[slug]/page.tsx`
- Create: `src/components/PostDrawer.tsx`
- Modify: `src/styles/globals.css` (append drawer rules)

- [ ] **Step 1: Create `src/components/PostDrawer.tsx`**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function PostDrawer({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
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
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <button
        type="button"
        className="drawer-close"
        onClick={close}
        aria-label="Close article"
      >
        ×
      </button>
      <div className="drawer-content">{children}</div>
    </dialog>
  );
}
```

- [ ] **Step 2: Create `src/app/@drawer/(.)posts/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/posts';
import { PostDrawer } from '@/components/PostDrawer';
import { ArticleHeader } from '@/components/ArticleHeader';
import { ArticleBody } from '@/components/ArticleBody';
import { ArticleFooter } from '@/components/ArticleFooter';

export default async function InterceptedPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  return (
    <PostDrawer slug={post.slug}>
      <article className="article">
        <ArticleHeader post={post} />
        <ArticleBody source={post.body} />
        <ArticleFooter post={post} />
      </article>
    </PostDrawer>
  );
}
```

(`<RelatedPosts>` is added to both this and the regular post page in Task 6 once it exists.)

- [ ] **Step 3: Append drawer CSS to `src/styles/globals.css`**

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
.post-drawer[open] {
  transform: translateX(0);
}
.post-drawer::backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 0;
  transition:
    opacity 280ms ease,
    overlay 280ms ease allow-discrete,
    display 280ms ease allow-discrete;
}
.post-drawer[open]::backdrop {
  opacity: 1;
}
@starting-style {
  .post-drawer[open] {
    transform: translateX(100%);
  }
  .post-drawer[open]::backdrop {
    opacity: 0;
  }
}

.drawer-close {
  position: sticky;
  top: 12px;
  margin-left: auto;
  margin-right: 12px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--fg);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.drawer-close:hover {
  background: var(--bg-subtle);
}
.drawer-content {
  padding: 0 24px 64px;
}

@media (prefers-reduced-motion: reduce) {
  .post-drawer,
  .post-drawer::backdrop {
    transition:
      opacity 120ms ease,
      overlay 120ms ease allow-discrete,
      display 120ms ease allow-discrete;
    transform: none;
  }
  @starting-style {
    .post-drawer[open] {
      transform: none;
      opacity: 0;
    }
    .post-drawer[open]::backdrop {
      opacity: 0;
    }
  }
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm validate && pnpm build`
Expected: PASS. Build emits the `(.)posts/[slug]` intercepted route alongside the existing `/posts/[slug]` page.

- [ ] **Step 5: Smoke check**

Run: `pnpm dev`, open `http://localhost:3000`, click a card → drawer slides in, URL becomes `/posts/<slug>`, Esc closes, backdrop click closes, × closes. Refresh inside the drawer → falls through to the full page.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/app/@drawer/\(.\)posts/\[slug\]/page.tsx src/components/PostDrawer.tsx src/styles/globals.css
git commit -s -S -m "feat(drawer): intercepting route + PostDrawer with @starting-style transition"
```

---

## Task 3: Reading progress bar

**Files:**
- Create: `src/components/ReadingProgress.tsx`
- Modify: `src/app/layout.tsx` (mount `<ReadingProgress />`)
- Modify: `src/styles/globals.css` (append `.reading-progress` rules)

- [ ] **Step 1: Create `src/components/ReadingProgress.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function getScroller(): HTMLElement | Window {
  if (typeof document === 'undefined') return window;
  const drawer = document.querySelector<HTMLDialogElement>('dialog.post-drawer[open]');
  return drawer ?? window;
}

function readProgress(scroller: HTMLElement | Window): number {
  if (scroller instanceof Window) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, window.scrollY / max) : 0;
  }
  const max = scroller.scrollHeight - scroller.clientHeight;
  return max > 0 ? Math.min(1, scroller.scrollTop / max) : 0;
}

export function ReadingProgress() {
  const pathname = usePathname();
  const isPost = pathname?.startsWith('/posts/') ?? false;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPost) {
      setProgress(0);
      return;
    }
    let scroller = getScroller();
    function update() {
      setProgress(readProgress(scroller));
    }
    function rebind() {
      scroller.removeEventListener?.('scroll', update);
      scroller = getScroller();
      scroller.addEventListener?.('scroll', update, { passive: true } as AddEventListenerOptions);
      update();
    }
    rebind();
    window.addEventListener('resize', update);
    const obs = new MutationObserver(rebind);
    obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => {
      scroller.removeEventListener?.('scroll', update);
      window.removeEventListener('resize', update);
      obs.disconnect();
    };
  }, [isPost, pathname]);

  if (!isPost) return null;
  return (
    <div
      className="reading-progress"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      style={{ ['--progress' as string]: progress }}
    />
  );
}
```

- [ ] **Step 2: Mount `<ReadingProgress />` in `src/app/layout.tsx`**

Add the import:

```tsx
import { ReadingProgress } from '@/components/ReadingProgress';
```

Place `<ReadingProgress />` inside `<SearchProvider>` and before `<Topbar />`:

```tsx
<SearchProvider>
  <ReadingProgress />
  <a href="#main" className="skip-link">
    Skip to content
  </a>
  <Topbar />
  …
</SearchProvider>
```

- [ ] **Step 3: Append CSS to `src/styles/globals.css`**

```css
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--accent);
  width: calc(var(--progress, 0) * 100%);
  transition: width 60ms linear;
  z-index: 60;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .reading-progress {
    transition: none;
  }
}
```

- [ ] **Step 4: Verify**

Run: `pnpm validate && pnpm build`
Expected: PASS.

- [ ] **Step 5: Smoke check**

Run: `pnpm dev`, navigate to any `/posts/<slug>`, scroll → progress bar fills. Open a post via the drawer (click a card from `/`) → bar fills as you scroll the drawer. Navigate to `/` → bar disappears.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/ReadingProgress.tsx src/app/layout.tsx src/styles/globals.css
git commit -s -S -m "feat(reading): top-of-viewport progress bar (full page + drawer)"
```

---

## Task 4: Toast infrastructure

**Files:**
- Create: `src/components/ToastProvider.tsx`
- Create: `src/components/Toast.tsx`
- Modify: `src/app/layout.tsx` (mount `<ToastProvider>` + `<Toast />`)
- Modify: `src/styles/globals.css` (append `.toast-host` rules)

- [ ] **Step 1: Create `src/components/ToastProvider.tsx`**

```tsx
'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastState = { id: number; message: string };

type ToastApi = {
  show: (message: string) => void;
};

const Ctx = createContext<ToastApi | null>(null);
const StateCtx = createContext<ToastState | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setState({ id: Date.now(), message });
    timer.current = setTimeout(() => setState(null), 2200);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be called inside <ToastProvider>');
  return v;
}

export function useToastState(): ToastState | null {
  return useContext(StateCtx);
}
```

- [ ] **Step 2: Create `src/components/Toast.tsx`**

```tsx
'use client';

import { useToastState } from './ToastProvider';

export function Toast() {
  const state = useToastState();
  return (
    <div
      className="toast-host"
      role="status"
      aria-live="polite"
      data-show={state ? 'true' : 'false'}
    >
      {state?.message ?? ''}
    </div>
  );
}
```

- [ ] **Step 3: Mount in `src/app/layout.tsx`**

Imports:

```tsx
import { ToastProvider } from '@/components/ToastProvider';
import { Toast } from '@/components/Toast';
```

Wrap the inside of `<SearchProvider>` with `<ToastProvider>` and add `<Toast />` at the end:

```tsx
<SearchProvider>
  <ToastProvider>
    <ReadingProgress />
    <a href="#main" className="skip-link">
      Skip to content
    </a>
    <Topbar />
    <main id="main" className="main-content">
      {children}
    </main>
    {drawer}
    <Toast />
  </ToastProvider>
</SearchProvider>
```

- [ ] **Step 4: Append CSS to `src/styles/globals.css`**

```css
.toast-host {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  background: var(--bg-elevated);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-family: var(--font-mono);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease;
  z-index: 80;
}
.toast-host[data-show='true'] {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .toast-host {
    transition: none;
    transform: translateX(-50%);
  }
}
```

- [ ] **Step 5: Verify**

Run: `pnpm validate && pnpm build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ToastProvider.tsx src/components/Toast.tsx src/app/layout.tsx src/styles/globals.css
git commit -s -S -m "feat(toast): global ToastProvider + Toast surface"
```

---

## Task 5: Share button

**Files:**
- Create: `src/components/ShareButton.tsx`
- Modify: `src/components/ArticleHeader.tsx` (render `<ShareButton>`)
- Modify: `src/styles/globals.css` (append `.share-button` rules)

- [ ] **Step 1: Create `src/components/ShareButton.tsx`**

```tsx
'use client';

import { useToast } from './ToastProvider';

export function ShareButton({ url, title }: { url: string; title: string }) {
  const toast = useToast();

  async function share() {
    const target = url || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          url: target,
          title,
        });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(target);
      } else {
        // Older browsers: hidden input + execCommand fallback
        const ta = document.createElement('textarea');
        ta.value = target;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast.show('Link copied');
    } catch {
      // user-cancelled (web share) or denied — silent
    }
  }

  return (
    <button
      type="button"
      className="share-button"
      onClick={share}
      aria-label="Share article"
    >
      Share
    </button>
  );
}
```

- [ ] **Step 2: Modify `src/components/ArticleHeader.tsx` to render `<ShareButton>`**

Add the import:

```tsx
import { ShareButton } from './ShareButton';
```

Add `<ShareButton>` at the end of the meta row:

```tsx
<header className="article-header">
  <div className="article-meta">
    <span className="article-id">{post.id}</span>
    <span className="article-category">{post.category}</span>
    <span className="article-date">{fmtDate(post.date)}</span>
    <span className="article-readtime">{post.readTime} min read</span>
    <ShareButton url={`/posts/${post.slug}`} title={post.title} />
  </div>
  <h1 className="article-title">{post.title}</h1>
  <p className="article-excerpt">{post.excerpt}</p>
  <div className="article-cover">
    <Cover cover={post.cover} slug={post.slug} size="hero" />
  </div>
</header>
```

The relative `/posts/<slug>` is normalized to an absolute URL inside `share()` via `window.location.href` when called from the browser.

- [ ] **Step 3: Append CSS to `src/styles/globals.css`**

```css
.share-button {
  margin-left: auto;
  background: transparent;
  color: var(--fg-muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.share-button:hover {
  background: var(--bg-subtle);
  color: var(--fg);
}
```

- [ ] **Step 4: Verify**

Run: `pnpm validate && pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ShareButton.tsx src/components/ArticleHeader.tsx src/styles/globals.css
git commit -s -S -m "feat(share): copy-link button with toast on the article header"
```

---

## Task 6: Related posts (TDD logic + UI)

**Files:**
- Create: `src/lib/related.ts`
- Create: `src/lib/related.test.ts`
- Create: `src/components/RelatedPosts.tsx`
- Modify: `src/app/posts/[slug]/page.tsx` (render `<RelatedPosts>`)
- Modify: `src/app/@drawer/(.)posts/[slug]/page.tsx` (same)
- Modify: `src/styles/globals.css` (append `.related-posts` rules)

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/related.test.ts
import { describe, it, expect } from 'vitest';
import { rankRelated } from './related';
import type { Post } from './posts';

function p(over: Partial<Post>): Post {
  return {
    id: '0x000',
    title: 'T',
    slug: 's',
    excerpt: 'E',
    category: 'tech',
    tags: [],
    date: '2026-01-01',
    readTime: 1,
    size: 'small',
    cover: 'web',
    featured: false,
    draft: false,
    body: '',
    ...over,
  };
}

describe('rankRelated', () => {
  it('returns nothing when there are no candidates', () => {
    const current = p({ slug: 'a' });
    expect(rankRelated(current, [current])).toEqual([]);
  });

  it('ranks tag overlap higher than same-category', () => {
    const current = p({ slug: 'cur', category: 'tech', tags: ['rust', 'languages'] });
    const sameCatNoOverlap = p({ slug: 'sc', category: 'tech', tags: [] });
    const sharedOneTag = p({ slug: 'tag1', category: 'celestial', tags: ['rust'] });
    const sharedTwoTags = p({ slug: 'tag2', category: 'celestial', tags: ['rust', 'languages'] });
    const ranked = rankRelated(current, [current, sameCatNoOverlap, sharedOneTag, sharedTwoTags]);
    expect(ranked.map((r) => r.slug)).toEqual(['tag2', 'tag1', 'sc']);
  });

  it('breaks ties by date desc', () => {
    const current = p({ slug: 'cur', tags: ['x'] });
    const a = p({ slug: 'a', tags: ['x'], date: '2026-01-01' });
    const b = p({ slug: 'b', tags: ['x'], date: '2026-04-01' });
    const ranked = rankRelated(current, [current, a, b]);
    expect(ranked.map((r) => r.slug)).toEqual(['b', 'a']);
  });

  it('excludes drafts', () => {
    const current = p({ slug: 'cur', tags: ['x'] });
    const draft = p({ slug: 'd', tags: ['x'], draft: true });
    expect(rankRelated(current, [current, draft])).toEqual([]);
  });

  it('limits results to the top N (default 3)', () => {
    const current = p({ slug: 'cur', tags: ['x'] });
    const candidates = Array.from({ length: 10 }, (_, i) =>
      p({ slug: `s${i}`, id: `0x${i.toString(16).padStart(3, '0')}`, tags: ['x'] }),
    );
    const ranked = rankRelated(current, [current, ...candidates]);
    expect(ranked).toHaveLength(3);
  });

  it('respects custom limit', () => {
    const current = p({ slug: 'cur', tags: ['x'] });
    const candidates = Array.from({ length: 5 }, (_, i) =>
      p({ slug: `s${i}`, id: `0x${i.toString(16).padStart(3, '0')}`, tags: ['x'] }),
    );
    expect(rankRelated(current, [current, ...candidates], 5)).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run; expect failure**

Run: `pnpm test src/lib/related`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/related.ts`**

```ts
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

- [ ] **Step 4: Run; expect pass**

Run: `pnpm test src/lib/related`
Expected: PASS — 6 tests.

- [ ] **Step 5: Create `src/components/RelatedPosts.tsx`**

```tsx
import Link from 'next/link';
import { Cover } from '@/covers';
import { fmtDate } from '@/lib/format';
import { getAllPosts, type Post } from '@/lib/posts';
import { rankRelated } from '@/lib/related';

export async function RelatedPosts({ post }: { post: Post }) {
  const all = await getAllPosts();
  const related = rankRelated(post, all);
  if (related.length === 0) return null;
  return (
    <aside className="related-posts" aria-label="Related posts">
      <h2 className="related-heading">Related</h2>
      <ul className="related-list">
        {related.map((r) => (
          <li key={r.slug} className="related-item">
            <Link href={`/posts/${r.slug}`} className="related-link">
              <div className="related-cover">
                <Cover cover={r.cover} slug={r.slug} size="small" />
              </div>
              <div className="related-meta">
                <span className="related-date">{fmtDate(r.date)}</span>
                <h3 className="related-title">{r.title}</h3>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 6: Render `<RelatedPosts post={post} />` in `src/app/posts/[slug]/page.tsx`**

Add the import:

```tsx
import { RelatedPosts } from '@/components/RelatedPosts';
```

Place it inside the `<article>` after the footer:

```tsx
return (
  <article className="article">
    <ArticleHeader post={post} />
    <ArticleBody source={post.body} />
    <ArticleFooter post={post} />
    <RelatedPosts post={post} />
  </article>
);
```

- [ ] **Step 7: Render `<RelatedPosts>` in `src/app/@drawer/(.)posts/[slug]/page.tsx`**

Add the same import and placement:

```tsx
import { RelatedPosts } from '@/components/RelatedPosts';
```

```tsx
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
```

- [ ] **Step 8: Append CSS to `src/styles/globals.css`**

```css
.related-posts {
  margin: 64px 0 0;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}
.related-heading {
  font-family: var(--font-mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
  margin: 0 0 16px;
}
.related-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
@media (max-width: 720px) {
  .related-list { grid-template-columns: 1fr; }
}
.related-link {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}
.related-cover {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 6px;
}
.related-cover svg,
.related-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.related-date {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-faint);
}
.related-title {
  font-size: 14px;
  margin: 4px 0 0;
  line-height: 1.35;
}
```

- [ ] **Step 9: Verify**

Run: `pnpm validate && pnpm build`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/related.ts src/lib/related.test.ts \
        src/components/RelatedPosts.tsx \
        src/app/posts/\[slug\]/page.tsx \
        src/app/@drawer/\(.\)posts/\[slug\]/page.tsx \
        src/styles/globals.css
git commit -s -S -m "feat(related): add ranked related posts to article pages"
```

---

## Task 7: Sort logic (TDD) + `<SortDropdown>`

**Files:**
- Modify: `src/lib/posts.ts` (export `Sort` type and `applySort`)
- Modify: `src/lib/posts.test.ts` (add `applySort` tests)
- Create: `src/components/SortDropdown.tsx`
- Modify: `src/styles/globals.css` (append `.sort-dropdown` rules)

(Listing-page integration is Task 8.)

- [ ] **Step 1: Append failing test to `src/lib/posts.test.ts`**

Add at the bottom:

```ts
describe('applySort', () => {
  const a = { slug: 'a', date: '2026-01-01' } as never;
  const b = { slug: 'b', date: '2026-04-01' } as never;
  const c = { slug: 'c', date: '2026-02-01' } as never;
  const newestFirst = [b, c, a]; // pre-sorted as getAllPosts returns

  it('returns the input unchanged when sort is "newest"', async () => {
    const { applySort } = await import('./posts');
    expect(applySort(newestFirst, 'newest')).toEqual(newestFirst);
  });

  it('reverses to oldest-first when sort is "oldest"', async () => {
    const { applySort } = await import('./posts');
    expect(applySort(newestFirst, 'oldest')).toEqual([a, c, b]);
  });
});
```

- [ ] **Step 2: Run; expect failure**

Run: `pnpm test src/lib/posts`
Expected: FAIL — `applySort` is not exported.

- [ ] **Step 3: Add `applySort` and `Sort` type to `src/lib/posts.ts`**

Append after the existing `getCategoryCounts` export:

```ts
export type Sort = 'newest' | 'oldest';

export function applySort<T extends { date: string }>(posts: readonly T[], sort: Sort): T[] {
  if (sort === 'oldest') {
    return [...posts].sort((a, b) => a.date.localeCompare(b.date));
  }
  return [...posts];
}
```

- [ ] **Step 4: Run; expect pass**

Run: `pnpm test src/lib/posts`
Expected: PASS.

- [ ] **Step 5: Create `src/components/SortDropdown.tsx`**

```tsx
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
```

- [ ] **Step 6: Append CSS to `src/styles/globals.css`**

```css
.sort-dropdown select {
  background: var(--bg-elevated);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
}
.sort-dropdown select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 7: Verify**

Run: `pnpm validate && pnpm build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/posts.ts src/lib/posts.test.ts src/components/SortDropdown.tsx src/styles/globals.css
git commit -s -S -m "feat(sort): add applySort + SortDropdown (no listing wiring yet)"
```

---

## Task 8: `<FilterChips>` + URL helper + listing-page wiring

**Files:**
- Create: `src/components/FilterChips.tsx`
- Modify: `src/app/page.tsx` (render chips + sort dropdown, honor sort)
- Modify: `src/app/category/[id]/page.tsx` (same)
- Modify: `src/app/tag/[name]/page.tsx` (same)
- Modify: `src/styles/globals.css` (append chip rules + listing-toolbar layout)

- [ ] **Step 1: Create `src/components/FilterChips.tsx`**

```tsx
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
  /** The path the chips should reset to (e.g. '/' for the homepage). */
  basePath: string;
  /** The query-string params to keep when removing each filter. */
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
  // category/tag filters are encoded in the path, not the query, so they're
  // removed by navigating to basePath without that segment.
  let path = basePath;
  if (filter.type === 'category' || filter.type === 'tag') path = '/';
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
```

- [ ] **Step 2: Wire into `src/app/page.tsx`**

Replace the file contents:

```tsx
import { Sidebar } from '@/components/Sidebar';
import { applySort, getAllPosts, type Sort } from '@/lib/posts';
import { FilteredGrid } from '@/components/FilteredGrid';
import { FilterChips, type ActiveFilter } from '@/components/FilterChips';
import { SortDropdown } from '@/components/SortDropdown';

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
```

- [ ] **Step 3: Wire into `src/app/category/[id]/page.tsx`**

Replace the file contents:

```tsx
import { notFound } from 'next/navigation';
import { CATEGORIES, isKnownCategory, categoryById } from '@/lib/categories';
import { applySort, getPostsByCategory, type Sort } from '@/lib/posts';
import { Sidebar } from '@/components/Sidebar';
import { FilteredGrid } from '@/components/FilteredGrid';
import { FilterChips, type ActiveFilter } from '@/components/FilterChips';
import { SortDropdown } from '@/components/SortDropdown';

export async function generateStaticParams() {
  return CATEGORIES.filter((c) => c.id !== 'all').map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cat = categoryById(id);
  return cat
    ? { title: `${cat.label} — Omni-Verse Blog`, description: `Posts in ${cat.label}` }
    : {};
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id } = await params;
  if (!isKnownCategory(id) || id === 'all') notFound();
  const sp = await searchParams;
  const sort: Sort = sp.sort === 'oldest' ? 'oldest' : 'newest';
  const posts = applySort(await getPostsByCategory(id), sort);

  const baseParams = new URLSearchParams();
  if (sort === 'oldest') baseParams.set('sort', 'oldest');

  const active: ActiveFilter[] = [
    { type: 'category', value: id, label: `category: ${id}` },
  ];
  if (sort === 'oldest') active.push({ type: 'sort', value: 'oldest', label: 'oldest first' });

  return (
    <div className="layout-with-sidebar">
      <Sidebar activeCategory={id} />
      <section>
        <header className="listing-header">
          <h1>{categoryById(id)?.label}</h1>
          <p>
            {posts.length} post{posts.length === 1 ? '' : 's'}
          </p>
        </header>
        <div className="listing-toolbar">
          <FilterChips active={active} basePath={`/category/${id}`} baseParams={baseParams} />
          <SortDropdown current={sort} />
        </div>
        <FilteredGrid posts={posts} />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Wire into `src/app/tag/[name]/page.tsx`**

Replace the file contents:

```tsx
import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { applySort, getAllPosts, getPostsByTag, type Sort } from '@/lib/posts';
import { FilteredGrid } from '@/components/FilteredGrid';
import { FilterChips, type ActiveFilter } from '@/components/FilterChips';
import { SortDropdown } from '@/components/SortDropdown';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  const tags = new Set<string>();
  for (const p of posts) for (const t of p.tags) tags.add(t);
  return [...tags].map((name) => ({ name }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return { title: `#${name} — Omni-Verse Blog`, description: `Posts tagged #${name}` };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { name } = await params;
  const sp = await searchParams;
  const sort: Sort = sp.sort === 'oldest' ? 'oldest' : 'newest';
  const posts = applySort(await getPostsByTag(name), sort);
  if (posts.length === 0) notFound();

  const baseParams = new URLSearchParams();
  if (sort === 'oldest') baseParams.set('sort', 'oldest');

  const active: ActiveFilter[] = [
    { type: 'tag', value: name, label: `#${name}` },
  ];
  if (sort === 'oldest') active.push({ type: 'sort', value: 'oldest', label: 'oldest first' });

  return (
    <div className="layout-with-sidebar">
      <Sidebar activeTag={name} />
      <section>
        <header className="listing-header">
          <h1>#{name}</h1>
          <p>
            {posts.length} post{posts.length === 1 ? '' : 's'}
          </p>
        </header>
        <div className="listing-toolbar">
          <FilterChips active={active} basePath={`/tag/${name}`} baseParams={baseParams} />
          <SortDropdown current={sort} />
        </div>
        <FilteredGrid posts={posts} />
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Append CSS to `src/styles/globals.css`**

```css
.listing-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: 0 0 16px;
  min-height: 32px;
}
.filter-chips {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-bg);
  color: var(--fg);
  border: 1px solid var(--accent);
  border-radius: 999px;
  padding: 4px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  text-decoration: none;
}
.filter-chip:hover {
  background: var(--bg-subtle);
}
.filter-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 6: Verify**

Run: `pnpm validate && pnpm build`
Expected: PASS. Static generation still emits all 62 routes.

- [ ] **Step 7: Smoke check**

Run: `pnpm dev`. On `/`, the topbar still works; the toolbar shows nothing yet (no filters active). On `/?sort=oldest`, the chips show "oldest first ×" and clicking it returns to `/`. On `/category/tech`, the chip "category: tech ×" links back to `/`. On `/tag/rust`, the chip "#rust ×" links back to `/`. SortDropdown reverses ordering.

Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/components/FilterChips.tsx \
        src/app/page.tsx src/app/category/\[id\]/page.tsx src/app/tag/\[name\]/page.tsx \
        src/styles/globals.css
git commit -s -S -m "feat(filters): listing-toolbar with FilterChips + SortDropdown"
```

---

## Task 9: Highlight utility (TDD)

**Files:**
- Create: `src/lib/highlight.tsx`
- Create: `src/lib/highlight.test.tsx`

(Both files need `.tsx` because they emit JSX. Vitest config already globs both `.test.ts` and `.test.tsx`.)

- [ ] **Step 1: Write the failing tests**

```tsx
// src/lib/highlight.test.tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { highlight } from './highlight';

function render(text: string, ranges: ReadonlyArray<readonly [number, number]>): string {
  return renderToStaticMarkup(<>{highlight(text, ranges)}</>);
}

describe('highlight', () => {
  it('returns the text unchanged when there are no ranges', () => {
    expect(render('hello world', [])).toBe('hello world');
  });

  it('wraps a single range in <mark>', () => {
    expect(render('hello world', [[0, 4]])).toBe('<mark>hello</mark> world');
  });

  it('handles multiple non-overlapping ranges', () => {
    expect(render('hello world!', [[0, 4], [6, 10]])).toBe(
      '<mark>hello</mark> <mark>world</mark>!',
    );
  });

  it('handles a range at the very end of the string', () => {
    expect(render('say hi', [[4, 5]])).toBe('say <mark>hi</mark>');
  });

  it('handles a full-string match', () => {
    expect(render('omg', [[0, 2]])).toBe('<mark>omg</mark>');
  });

  it('sorts unsorted ranges before rendering', () => {
    expect(render('abc def', [[4, 6], [0, 2]])).toBe(
      '<mark>abc</mark> <mark>def</mark>',
    );
  });
});
```

- [ ] **Step 2: Run; expect failure**

Run: `pnpm test src/lib/highlight`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/highlight.tsx`**

```tsx
import { Fragment, type ReactNode } from 'react';

export type Range = readonly [number, number]; // inclusive start, inclusive end

export function highlight(text: string, ranges: ReadonlyArray<Range>): ReactNode {
  if (ranges.length === 0) return text;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let cursor = 0;
  sorted.forEach(([start, end], i) => {
    if (start > cursor) {
      out.push(<Fragment key={`t${i}`}>{text.slice(cursor, start)}</Fragment>);
    }
    out.push(<mark key={`m${i}`}>{text.slice(start, end + 1)}</mark>);
    cursor = end + 1;
  });
  if (cursor < text.length) {
    out.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  }
  return <>{out}</>;
}
```

Note: the test imports `react-dom/server` — `react-dom` is already a runtime dependency (Phase 1 installed it via Next.js). No new install required.

- [ ] **Step 4: Run; expect pass**

Run: `pnpm test src/lib/highlight`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/highlight.tsx src/lib/highlight.test.tsx
git commit -s -S -m "feat(search): add highlight() utility with vitest coverage"
```

---

## Task 10: Server-side search

**Files:**
- Create: `src/lib/search-server.ts`

- [ ] **Step 1: Implement `src/lib/search-server.ts`**

```ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { SearchIndexEntry } from './search-index';

export type ServerMatch = {
  entry: SearchIndexEntry;
  /** Per-field match indices keyed by SearchIndexEntry field name (title/excerpt/etc). */
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
  const file = path.join(process.cwd(), 'public', 'search-index.json');
  const json = await readFile(file, 'utf8');
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
  matches: readonly { key?: string; indices: readonly (readonly [number, number])[] }[] | undefined,
): Record<string, Array<readonly [number, number]>> {
  const out: Record<string, Array<readonly [number, number]>> = {};
  if (!matches) return out;
  for (const m of matches) {
    if (!m.key) continue;
    out[m.key] = (out[m.key] ?? []).concat(m.indices.map(([s, e]) => [s, e] as const));
  }
  return out;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/search-server.ts
git commit -s -S -m "feat(search): add server-side fuse.js search with match indices"
```

---

## Task 11: `<SearchResults>` component

**Files:**
- Create: `src/components/SearchResults.tsx`
- Modify: `src/styles/globals.css` (append `.search-results` rules)

- [ ] **Step 1: Create `src/components/SearchResults.tsx`**

```tsx
import Link from 'next/link';
import { Cover } from '@/covers';
import { fmtDate } from '@/lib/format';
import { highlight } from '@/lib/highlight';
import { getPostBySlug } from '@/lib/posts';
import type { ServerMatch } from '@/lib/search-server';

export async function SearchResults({
  query,
  matches,
}: {
  query: string;
  matches: ServerMatch[];
}) {
  if (!query) {
    return (
      <section className="search-results-empty">
        <p>Type something in the topbar to search.</p>
      </section>
    );
  }
  if (matches.length === 0) {
    return (
      <section className="search-results-empty">
        <p>
          No posts match <q>{query}</q>.
        </p>
      </section>
    );
  }
  // Resolve full posts for rendering (gives us date / readTime / cover).
  const resolved = await Promise.all(
    matches.map(async (m) => ({
      m,
      post: await getPostBySlug(m.entry.slug),
    })),
  );
  return (
    <section className="search-results">
      <header className="search-results-header">
        <h1>
          {matches.length} result{matches.length === 1 ? '' : 's'} for <q>{query}</q>
        </h1>
      </header>
      <ul className="search-results-list">
        {resolved.map(({ m, post }) =>
          post ? (
            <li key={post.slug} className="search-result">
              <Link href={`/posts/${post.slug}`} className="search-result-link">
                <div className="search-result-cover">
                  <Cover cover={post.cover} slug={post.slug} size="small" />
                </div>
                <div className="search-result-body">
                  <div className="search-result-meta">
                    <span>{post.category}</span>
                    <span>{fmtDate(post.date)}</span>
                    <span>{post.readTime} min</span>
                  </div>
                  <h2 className="search-result-title">
                    {highlight(post.title, m.fields.title ?? [])}
                  </h2>
                  <p className="search-result-excerpt">
                    {highlight(post.excerpt, m.fields.excerpt ?? [])}
                  </p>
                  {post.tags.length > 0 && (
                    <ul className="search-result-tags">
                      {post.tags.map((t) => (
                        <li key={t}>#{t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Append CSS to `src/styles/globals.css`**

```css
.search-results-header h1 {
  font-size: 20px;
  margin: 0 0 16px;
}
.search-results-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.search-result {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.search-result-link {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 16px;
  padding: 12px;
  text-decoration: none;
  color: inherit;
  align-items: start;
}
.search-result-cover {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 6px;
}
.search-result-cover svg,
.search-result-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.search-result-meta {
  display: flex;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-faint);
  margin-bottom: 4px;
}
.search-result-title {
  font-size: 16px;
  margin: 0 0 4px;
}
.search-result-title mark,
.search-result-excerpt mark {
  background: var(--accent-bg);
  color: var(--fg);
  padding: 0 2px;
  border-radius: 2px;
}
.search-result-excerpt {
  font-size: 14px;
  color: var(--fg-muted);
  margin: 0 0 8px;
}
.search-result-tags {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-faint);
}
.search-results-empty {
  padding: 32px 0;
  color: var(--fg-muted);
  font-size: 14px;
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/SearchResults.tsx src/styles/globals.css
git commit -s -S -m "feat(search): add SearchResults component with match highlighting"
```

---

## Task 12: `/search?q=…` page

**Files:**
- Create: `src/app/search/page.tsx`

- [ ] **Step 1: Create `src/app/search/page.tsx`**

```tsx
import { Sidebar } from '@/components/Sidebar';
import { SearchResults } from '@/components/SearchResults';
import { searchOnServer } from '@/lib/search-server';
import { FilterChips, type ActiveFilter } from '@/components/FilterChips';

export const metadata = {
  title: 'Search — Omni-Verse Blog',
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
```

- [ ] **Step 2: Verify**

Run: `pnpm validate && pnpm build`
Expected: PASS. Build emits `/search` as a server-rendered route (it depends on `searchParams`, so it's not statically pre-rendered — that's fine).

- [ ] **Step 3: Smoke check**

Run: `pnpm dev`, open `http://localhost:3000/search?q=rust` → results page with Rust article highlighted. `/search` (no `q`) → empty state. `/search?q=zzznoresults` → no-match state.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/search/page.tsx
git commit -s -S -m "feat(search): /search?q=… results page"
```

---

## Task 13: `<SearchInput>` Enter-to-search

**Files:**
- Modify: `src/components/SearchInput.tsx`

- [ ] **Step 1: Update `src/components/SearchInput.tsx` to navigate on Enter**

Replace the file:

```tsx
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

  return (
    <form className="search-wrap" onSubmit={onSubmit} role="search">
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
    </form>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm validate && pnpm build`
Expected: PASS.

- [ ] **Step 3: Smoke check**

Run: `pnpm dev`, type "rust" in topbar on `/`, press Enter → navigates to `/search?q=rust`. Topbar live-filter still works on `/`/category/tag pages while typing.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/SearchInput.tsx
git commit -s -S -m "feat(search): SearchInput Enter navigates to /search?q=…"
```

---

## Task 14: Final smoke + production build + push

**Files:** none modified.

- [ ] **Step 1: Run full validate + build**

Run: `pnpm validate && pnpm build`

Expected:
- Validate: clean (typecheck + lint + tests).
- Build: emits routes including `/search`, the intercepted `(.)posts/[slug]`, plus all Phase 1 routes. All 14 post pages still pre-rendered.

- [ ] **Step 2: Run `pnpm start` and walk every flow**

Run: `pnpm start`

Verify each:
- `/` — chips/sort toolbar present (empty when no filters); click a card → drawer slides in; Esc closes; tag chip inside drawer navigates and unmounts; share button copies URL and shows toast.
- `/?sort=oldest` — oldest-first listing; "oldest first ×" chip removes the param.
- `/category/tech` — chip "category: tech ×" links to `/`. Sort works.
- `/tag/rust` — chip "#rust ×" links to `/`. Sort works.
- `/posts/<slug>` direct visit — full page; reading-progress bar fills; related posts at the bottom.
- `/search?q=rust` — single result with `<mark>`-highlighted matches in title/excerpt; chip removes `q`.
- `/search` — empty state.
- Esc / × / backdrop close drawer; refresh inside drawer falls through to full page.
- Theme toggle still flips with no FOUC.
- DevTools → emulate `prefers-reduced-motion: reduce` → drawer fades instead of sliding; reading-progress jumps; toast appears without fade.

Stop the server.

- [ ] **Step 3: Push to `main`**

(Per project memory, this is a solo-dev project; if work was done directly on `main`, just push. If work was done in a worktree, merge with `--no-ff` then push.)

```bash
# Direct on main (hybrid execution path):
git push

# Or, if from a worktree:
# git -C /Users/red/omni-verse-blog merge --no-ff -S phase-2-reading-polish
# git -C /Users/red/omni-verse-blog push
```

When CI passes on `main`, Phase 2 is shipped. Phase 3 (auth + DB + interactions) gets its own brainstorm + plan when we reach it.

---

## Self-review notes

- **Spec coverage** — every section of `2026-04-26-omni-verse-blog-phase-2-design.md` is implemented: drawer (Tasks 1–2), reading progress (Task 3), toasts (Task 4), share (Task 5), related (Task 6), sort + chips (Tasks 7–8), highlight (Task 9), server search (Task 10), search results (Tasks 11–12), search input Enter (Task 13).
- **Placeholder scan** — no `TBD` / `TODO` / `implement later` / "similar to Task N" — every task has its full code.
- **Type consistency** — `Sort`, `ActiveFilter`, `ServerMatch`, `SearchIndexEntry`, `Post`, `Range` are referenced identically wherever they appear.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-26-omni-verse-blog-phase-2-plan.md`.**

Two execution options. Per memory (`feedback_worktree_for_subagents.md`), worktree only if subagent-driven; otherwise work on `main` directly.

1. **Subagent-Driven** — fresh subagent per task in `../omni-verse-blog-phase-2` worktree, spec + code-quality review between tasks. Phase 1 spent ~13 minutes on a stalled `pnpm install` subagent; Phase 2 has no equivalent long-running command, so this should run cleaner.
2. **Hybrid (recommended, matches Phase 1)** — I execute the 14 tasks directly on `main`, dispatch a single review subagent at one or two checkpoints (after Task 6 covers the article reading flow, then again after Task 13 covers search), final review at the end.

**Which approach?**
