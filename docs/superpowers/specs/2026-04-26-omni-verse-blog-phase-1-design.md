# Omni-Verse Blog — Phase 1 Design

**Status:** Approved (brainstorm), pending implementation plan
**Date:** 2026-04-26
**Author:** Red + Claude
**Source brief:** `CLAUDE_CODE_HANDOFF.md`
**Source prototype:** `Omni-Verse Blog.html`, `app.jsx`, `styles.css`, `data.jsx`, `covers.jsx`, `tweaks-panel.jsx`

## 1. Scope and decomposition

The handoff describes a full-featured personal blog with reading, search, auth, comments, likes, bookmarks, MDX content, design system migration, tests, CI, and deployment. That is too much for a single implementation plan. The work is split into four independently-shippable phases:

| Phase | Outcome | Headline features |
|---|---|---|
| **1. Static MVP (this spec)** | A public, readable blog you can deploy and share. | Next.js 15 scaffold, design tokens lifted, MDX pipeline, 14 seed posts converted, magazine grid, post / category / tag pages, theme toggle, SVG cover system, client-side topbar search. |
| 2. Reading polish | Prototype-fidelity browsing experience. | Drawer routing (intercepting routes), reading progress bar, related posts, toasts, sort, active-filter chips, dedicated `/search` page. |
| 3. Identity and interactions | Blog becomes interactive. | Auth.js (GitHub + Google), SQLite + Drizzle, likes, comments, bookmarks (localStorage merge on sign-in). |
| 4. Quality bar and deploy | Lighthouse-grade, fully tested, fully documented. | `pnpm new-post` CLI, OG / Twitter cards, sitemap, RSS, Lighthouse tuning, accessibility audit, Vitest + Playwright, Vercel + Turso production config, `README` / `CONTRIBUTING` / `MIGRATION`. |

This document covers Phase 1 only. Subsequent phases get their own brainstorm + spec when we reach them.

## 2. Architecture

### Stack

- **Framework:** Next.js 15 (App Router) with React Server Components.
- **Language:** TypeScript, strict mode.
- **Content:** MDX files in `content/posts/*.mdx` parsed with `gray-matter` and compiled in Server Components via `next-mdx-remote/rsc`. Frontmatter validated at build time with Zod.
- **Styling:** The prototype's `styles.css` lifted verbatim into `src/styles/globals.css`. CSS Modules added later only for genuinely component-scoped concerns. No UI library, no Tailwind.
- **Theming:** Light/dark via `[data-theme]` on `<html>`. Default = `prefers-color-scheme`; manual override stored in `localStorage`.
- **Search:** Client-side `fuse.js` over a build-time-emitted `public/search-index.json`.
- **Database / auth / server actions:** none in Phase 1.
- **Fonts:** `next/font/google` for Inter, JetBrains Mono, Source Serif 4 (self-hosted at build time).
- **Syntax highlighting:** Shiki via `rehype-pretty-code`, dual themes (`github-light` / `github-dark`).
- **Package manager:** pnpm.
- **Node version:** 20 LTS, pinned via `.nvmrc` and `engines` in `package.json`.
- **Lint / format:** ESLint (Next.js flat config) + Prettier.
- **Deployment:** Vercel.

### Project layout

```
omni-verse-blog/
├── content/
│   ├── posts/
│   │   └── <slug>.mdx                     ← 14 converted from data.jsx
│   └── categories.ts                       ← open-ended category list
├── src/
│   ├── app/
│   │   ├── layout.tsx                      ← root layout, fonts, theme bootstrap
│   │   ├── page.tsx                        ← / (magazine homepage)
│   │   ├── posts/[slug]/page.tsx
│   │   ├── category/[id]/page.tsx
│   │   ├── tag/[name]/page.tsx
│   │   └── not-found.tsx
│   ├── components/                         ← Topbar, Sidebar, Cards, Search, ThemeToggle…
│   ├── covers/
│   │   ├── index.tsx                       ← <Cover> resolver
│   │   ├── default.tsx
│   │   └── <name>.tsx                      ← one file per generator
│   ├── lib/
│   │   ├── posts.ts                        ← read MDX, parse frontmatter, sort, filter
│   │   ├── categories.ts
│   │   ├── search.ts                       ← fuse.js index loader (client)
│   │   └── prng.ts                         ← mulberry32 (deterministic seeded RNG)
│   └── styles/
│       └── globals.css                     ← prototype's styles.css verbatim
├── public/
│   ├── covers/                             ← real JPGs (Phase 4); empty in Phase 1
│   └── search-index.json                   ← emitted by prebuild
├── scripts/
│   ├── migrate-data.ts                     ← one-time data.jsx → MDX
│   └── build-search-index.ts               ← prebuild step
├── docs/
├── .github/workflows/ci.yml
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Rendering model

- All pages statically generated at build time. `generateStaticParams` enumerates posts, categories, and tags from `content/`.
- Client components are narrowly scoped islands: `<ThemeToggle>`, `<SearchProvider>` + `<SearchInput>`, `<FilteredGrid>`. Everything else (layout, sidebar, cards, article body, covers) is RSC.
- Theme is applied before paint by an inline blocking `<script>` in the root layout's `<head>` (no FOUC).

### Data shape

```ts
export type Post = {
  id: string;            // '0x4f2'
  slug: string;          // matches filename
  title: string;
  excerpt: string;
  category: string;      // must exist in CATEGORIES
  tags: string[];
  date: string;          // ISO 'YYYY-MM-DD'
  readTime: number;
  size: 'hero' | 'wide' | 'medium' | 'small';
  cover: string;         // generator key OR cover filename without extension
  featured?: boolean;
  draft?: boolean;
  body: string;          // raw MDX
};
```

`likes` and `comments` are intentionally absent. They return in Phase 3.

## 3. Pages and components

### Routes

| Route | Source | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Magazine homepage: hero post + mixed grid + sidebar + topbar. |
| `/posts/[slug]` | `app/posts/[slug]/page.tsx` | Full article page. No drawer in Phase 1. |
| `/category/[id]` | `app/category/[id]/page.tsx` | Filtered grid for one category. |
| `/tag/[name]` | `app/tag/[name]/page.tsx` | Filtered grid for one tag. |
| `/_not-found` | `app/not-found.tsx` | Themed 404 with sidebar + topbar + "browse all posts" CTA. |

### Components

| Component | Type | Responsibility |
|---|---|---|
| `<Topbar>` | client | Brand mark, `<SearchInput>`, `<ThemeToggle>`. Auth / bookmark slots present but hidden in Phase 1. |
| `<Sidebar>` | server | Categories with live counts derived from posts; popular tags (top N by frequency). Sticky on desktop, hidden under 900px. |
| `<CardGrid>` | server | Renders posts in a 6-column CSS grid using each post's `size`. |
| `<Card>` | server | Variants: `hero`, `wide`, `medium`, `small`. Wraps `<Cover>` + meta + title + excerpt + tag chips. The title is the only real `<a>` (`href="/posts/<slug>"`); the entire card surface is made clickable via a `::after { position: absolute; inset: 0 }` overlay on that link, so tag chips inside the card stay independently focusable and clickable. Single accessible name (the title), no nested-interactive footguns. |
| `<Cover>` | server | Resolves frontmatter `cover` → real JPG (if exists) → named SVG generator → default SVG. |
| `<ThemeToggle>` | client | Persists to `localStorage`, flips `[data-theme]`. |
| `<SearchProvider>` | client | Lazy-fetches `search-index.json` on first focus; builds fuse.js instance; exposes `query`/`setQuery`/`results` via context. On mount, initializes `query` from the URL `?q=…` parameter so direct links into a search state work. |
| `<SearchInput>` | client | Debounced (150ms), `/` keyboard shortcut, `Esc` to clear. |
| `<FilteredGrid>` | client | Wraps the server-rendered `<CardGrid>`, intersects server-passed posts with search results. |
| `<ArticleHeader>` / `<ArticleBody>` / `<ArticleFooter>` | server | The post page. `<ArticleBody>` renders MDX with custom components. |
| `<ThemeBootstrap>` | inline `<script>` | Pre-paint theme application. |

### Grid mapping (lifted from `styles.css` verbatim)

- Container: `grid-template-columns: repeat(6, 1fr)` at desktop.
- `card-hero` → `grid-column: span 6`
- `card-wide` → `grid-column: span 4`
- `card-medium` → `grid-column: span 3`
- `card-small` → `grid-column: span 2`
- Below 900px: collapses to single column.

### Explicitly deferred from the prototype

| Prototype feature | Phase | Reason |
|---|---|---|
| Drawer / intercepting routes | 2 | Real `/posts/[slug]` pages first. |
| Reading progress bar | 2 | Reading-experience polish. |
| Related posts | 2 | Same. |
| Toast notifications | 2 | No interactions to confirm in Phase 1. |
| Sort dropdown (newest / popular / oldest) | 2 | "Popular" needs DB data. Phase 1 is always-newest. |
| Active-filter chips | 2 | URL drives state; chips are nice-to-have UX. |
| Likes / bookmarks / comments / sign-in | 3 | All gated on auth + DB. |
| Tweaks panel | (skip) | Design is signed off. |
| `/search?q=…` dedicated page | 2 | Topbar live-filter is enough for Phase 1. |
| `/bookmarks` page | 3 | Same as bookmarks. |

## 4. Content pipeline

### File convention

`content/posts/<slug>.mdx`. Slug = URL = filename. Date and id stay in frontmatter.

### Frontmatter schema

Validated at build time with Zod. A typo in `category`, missing `date`, or malformed `cover` fails the build.

```yaml
---
id: '0x4f2'
title: 'Why the Jovian moons still keep me up at night'
slug: 'why-the-jovian-moons-still-keep-me-up-at-night'
excerpt: 'Europa hides an ocean…'
category: celestial
tags: [astronomy, jupiter, space-probes, long-read]
date: '2026-04-22'
readTime: 9
size: hero
cover: jovian
featured: true
draft: false
---
```

Required fields: `id`, `title`, `slug`, `excerpt`, `category`, `tags`, `date`, `readTime`, `size`, `cover`. Optional: `featured` (default false), `draft` (default false). `slug` must equal the filename without extension. `category` must exist in `CATEGORIES`. `date` is always quoted in the source so YAML parses it as a string (the schema treats it as an ISO `YYYY-MM-DD` string, not a `Date`).

Per-file shape is checked by Zod; cross-file invariants — `id` unique across all posts, `slug` unique across all posts — are enforced by a small post-pass in `getAllPosts()` that runs once at build time and throws with the offending duplicates.

### Read pipeline

```ts
// src/lib/posts.ts (sketch)
export const getAllPosts = cache(async (): Promise<Post[]> => {
  const files = await readdir('content/posts');
  const posts = await Promise.all(files.map(parsePost));
  return posts
    .filter(p => process.env.NODE_ENV === 'production' ? !p.draft : true)
    .sort((a, b) => b.date.localeCompare(a.date));
});

export const getPostBySlug      = cache(async (slug: string) => { /* … */ });
export const getPostsByCategory = cache(async (id: string)   => { /* … */ });
export const getPostsByTag      = cache(async (name: string) => { /* … */ });
```

`React.cache` deduplicates reads inside a request. At build time everything runs once per page.

### Categories

```ts
// content/categories.ts
export const CATEGORIES = [
  { id: 'all',         label: 'All posts'   },
  { id: 'tech',        label: 'Tech'        },
  { id: 'programming', label: 'Programming' },
  { id: 'celestial',   label: 'Celestial'   },
  { id: 'family',      label: 'Family'      },
  { id: 'travel',      label: 'Travel'      },
  { id: 'books',       label: 'Books'       },
  { id: 'food',        label: 'Food'        },
  { id: 'essays',      label: 'Essays'      },
] as const;
```

Adding a new category = one line here + tagging it in MDX frontmatter, no other code changes. Counts derived at build time.

### MDX components map

| MDX element | Renders as |
|---|---|
| `p`, `ul`, `ol`, `blockquote` | semantic HTML inheriting `.article-body` typography |
| `h2`, `h3` | with auto-generated `id` (via `rehype-slug`) |
| `pre` / `code` | Shiki via `rehype-pretty-code`, dual themes, language label |
| `a` | `Link` for in-app paths, plain `<a target="_blank" rel="noreferrer">` for external |
| `img` | `next/image` with auto-sizing |

No custom MDX shortcodes in Phase 1.

### Migration script (`scripts/migrate-data.ts`)

One-time, run during initial setup, output committed to git.

1. Load `data.jsx`'s `POSTS` array.
2. For each post: derive filename from `slug`; assemble frontmatter; convert each `content[]` block:
   - `{type:'p', text}` → blank line + `text` + blank line
   - `{type:'h2', text}` → `## <text>`
   - `{type:'code', lang, text}` → fenced code block with `lang`
3. Drop `likes` and `comments` (Phase 3).
4. Write `content/posts/<slug>.mdx`. Validate against the Zod schema before writing.
5. Print summary; fail the run if any post fails validation.

## 5. Theme system

Three pieces, kept small.

1. **`<ThemeBootstrap>`** — inline blocking `<script>` in `<head>`, rendered server-side. Reads `localStorage.ovb-theme` (and falls back to `prefers-color-scheme`), sets `document.documentElement.dataset.theme` before paint. ~10 lines, no dependency on `next-themes`.
2. **`<ThemeToggle>`** — client component in the topbar. On click: writes `ovb-theme` and `ovb-theme-manual` to `localStorage`, flips `[data-theme]`. The `ovb-theme-manual` flag matches the prototype: once manually toggled, system changes stop overriding.
3. **CSS** handles the rest. `[data-theme="dark"]` selector in `globals.css` swaps the variables; every component reads from `var(--bg)`, `var(--fg)`, etc. No theme prop drilling.

**Reduced motion** (CSS-only via `prefers-reduced-motion`):

- `.brand-cursor` blink stops.
- Card hover lifts removed.
- Theme transition becomes instant.

## 6. Search

### Build-time index

`scripts/build-search-index.ts` runs as `prebuild` and emits `public/search-index.json`:

```jsonc
[
  {
    "slug": "why-the-jovian-moons-still-keep-me-up-at-night",
    "title": "Why the Jovian moons still keep me up at night",
    "excerpt": "Europa hides an ocean…",
    "tags": ["astronomy", "jupiter", "space-probes", "long-read"],
    "category": "celestial"
  }
]
```

For 14 posts: ~3 KB raw, ~1 KB gzipped.

### Client island

| Component | Responsibility |
|---|---|
| `<SearchProvider>` (root layout) | Lazy-fetches `/search-index.json` on first input focus; builds the fuse.js instance once; exposes `query`, `setQuery`, `results` via context. |
| `<SearchInput>` (topbar) | Controlled input, 150ms debounce, `/` keyboard shortcut to focus, `Esc` to clear. |
| `<FilteredGrid>` (homepage / category / tag) | Wraps the server-rendered card grid. If `query` is empty, renders all server-passed posts. If `query` is non-empty, filters to slugs in fuse results (intersection). |

### Behavior across pages

- `/` — search filters the full post list.
- `/category/<id>` — search filters within that category.
- `/tag/<name>` — search filters within that tag.
- `/posts/[slug]` — input is present in the topbar but doesn't filter; pressing Enter on a non-empty query navigates to `/?q=…`. The dedicated `/search` page lands in Phase 2.

### Match highlighting

Fuse returns match indices; render the title and excerpt with `<mark>` spans wrapping the matched substrings.

### Why client-side at this scale

14 posts grows linearly; fuse.js handles thousands trivially. SQLite FTS5 only earns its weight at hundreds of posts plus a server-side data flow we don't have in Phase 1.

## 7. Cover image system

### The contract

Frontmatter `cover` is a string key. The runtime resolver picks the rendering strategy:

```
cover: jovian
   │
   ▼
   resolveCover('jovian')
   │
   ├── fs.existsSync('public/covers/jovian.jpg')?  → <Image src="/covers/jovian.jpg" …>
   │   (Phase 4, when real images land — no code change required)
   │
   ├── COVER_GENERATORS['jovian']?                 → <JovianCover />
   │   (Phase 1 default — all 14 covers go through here)
   │
   └── fallback                                    → <DefaultCover seed={slug} />
```

Real images take priority; SVG generators are the fallback. Phase 4 just drops JPGs into `/public/covers/` and the build picks them up automatically.

### Porting `covers.jsx`

The prototype's flat object of named SVG generators (`jovian`, `rust`, `pancakes`, `config`, `notebook`, `tabs`, `lisbon`, `book`, `web`, `pluto`, `caldo`, `teach`, `sqlite`, `paint`) becomes one file per generator under `src/covers/`, each a server component. Splitting them out keeps per-file diffs small and tree-shaking honest.

### Deterministic randomness

The original generators use `Math.random()` for variation. We replace with a tiny seeded PRNG (mulberry32, ~10 lines) keyed off the post's slug, so a given post's cover is identical every build → no hydration mismatch, predictable thumbnails.

### Sizes

Each generator accepts a `size` prop and adjusts aspect ratio + level of detail:

- `hero` → 16:9, full detail
- `wide` → 16:9, full detail
- `medium` → 4:3, medium detail
- `small` → 1:1, low detail

### Loading and LCP

SVGs are inlined into server-rendered HTML — zero network requests, zero LCP cost. When real JPGs land in Phase 4, the hero cover gets `priority`.

## 8. Build, dev, and deployment

### `package.json` scripts

```json
{
  "scripts": {
    "dev":       "next dev",
    "build":     "pnpm run prebuild && next build",
    "prebuild":  "tsx scripts/build-search-index.ts",
    "start":     "next start",
    "lint":      "next lint",
    "format":    "prettier --write .",
    "typecheck": "tsc --noEmit",
    "validate":  "pnpm run typecheck && pnpm run lint",
    "migrate":   "tsx scripts/migrate-data.ts"
  }
}
```

### Build pipeline

1. `prebuild` emits `public/search-index.json` from frontmatter.
2. `next build` compiles all pages statically. `generateStaticParams` enumerates posts, categories, tags.
3. Output: prerendered HTML + minimal client JS (theme toggle, search island, filtered grid).

### Deployment — Vercel

- Zero-config: connect GitHub repo, Vercel detects Next.js.
- Production deploy on push to `main`; preview deploys for every other branch / PR.
- Phase 1 ships under `*.vercel.app`. Custom domain wired later in Vercel dashboard, no code change.

### Environment variables

None in Phase 1. (`AUTH_SECRET`, `GITHUB_*`, `GOOGLE_*`, `DATABASE_URL` arrive in Phase 3.)

### CI (`.github/workflows/ci.yml`)

```yaml
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm validate
      - run: pnpm build
```

Vercel runs the actual deploy build separately; GitHub Actions provides early signal on PRs.

### Dev experience

- `pnpm dev` — Next.js dev server, hot reload on MDX edits.
- `pnpm migrate` — one-time `data.jsx` → `content/posts/*.mdx` conversion.
- `.editorconfig` + `.prettierrc` + `eslint.config.mjs` (Next.js flat config) at repo root.
- `tsconfig.json` strict mode, `paths: { "@/*": ["src/*"] }`.

## 9. Testing, accessibility, performance, error handling

### Testing — Phase 1 is intentionally light

The Vitest + Playwright bar from the handoff is a Phase 4 polish item. Phase 1 high-value tests:

- **Build-time validation** (Zod on every frontmatter file). The build fails before deploy if a post is malformed.
- **Vitest unit tests** for pure utilities only:
  - `parsePost(file)` — happy path + each Zod error path.
  - `fmtDate` / `fmtRelative` — boundaries (today, yesterday, 6d, 7d, 29d, 30d, 364d, 365d).
  - `mulberry32(seed)` — same seed yields same sequence.
  - Search index builder — strips body, keeps only indexable fields, deterministic ordering.
- **Playwright deferred to Phase 4** with the rest of the quality bar.

### Accessibility

- `<nav aria-label="Categories">` for the sidebar; `<nav aria-label="Primary">` for the topbar. Skip-to-content link as the first focusable element.
- Each card has a single accessible link — the title (`<h2>` for hero/wide, `<h3>` for medium/small) wraps an `<a href="/posts/<slug>">`. The card surface is made fully clickable via the `::after { position: absolute; inset: 0 }` overlay on that title link, leaving tag chips and other interactive elements inside the card independently focusable. No nested links.
- `<ThemeToggle>` uses a real `<button>` with `aria-label` and `aria-pressed`.
- `<SearchInput>` is `<input type="search">` with an associated `<label>` (visually hidden). `/` shortcut documented in placeholder.
- Focus rings preserved from `styles.css` (`:focus-visible`). No `outline: none`.
- `prefers-reduced-motion` honored.
- `<html lang="en">` set on root layout. Per-page `<title>` via Next metadata API.

Drawer-as-`<dialog>` and full Lighthouse a11y pass live in Phase 2 and Phase 4 respectively.

### Performance

- Naturally fast: pure RSC + minimal client islands, self-hosted fonts via `next/font`, inlined SVG covers, no third-party scripts.
- Per-page client JS budget: theme toggle (~1 KB) + search island lazy-loaded on first focus (~5 KB fuse.js gz + ~1 KB index).
- LCP element is the hero card cover; SVG inline → instant.
- Lighthouse ≥95 target deferred to Phase 4. Phase 1 should land in the high 90s without effort.

### Error handling

- **Build-time:** Zod schema rejects malformed frontmatter with the exact file + field. Categories referenced in frontmatter that don't exist in `CATEGORIES` → fail.
- **Runtime 404s:** unknown slug / category / tag → `notFound()` in the page route → custom themed `not-found.tsx`.
- **No `try/catch` around content reads.** If `content/posts/` is missing or unreadable, the build dies — that's correct behavior.
- **No client-side error boundary in Phase 1.** Static blog, no async client logic that can fail. Added in Phase 3.

## 10. Open questions and explicit non-goals

### Non-goals (intentionally not in Phase 1)

- No database, no authentication, no server actions, no API routes.
- No drawer routing. `/posts/[slug]` is a real, full page.
- No likes, comments, bookmarks, sign-in UI, or user state of any kind.
- No `pnpm new-post` CLI (Phase 4).
- No sitemap, RSS, or OG/Twitter card image generation (Phase 4).
- No Playwright tests (Phase 4).
- No Lighthouse score targets enforced (Phase 4).
- No tweaks panel.

### Open questions

None blocking implementation. Custom domain selection and any cover-image direction (Phase 4) can be settled when those phases come up.

## 11. Acceptance criteria for Phase 1

- `pnpm dev` runs the blog locally with all 14 posts visible on the homepage in the magazine grid.
- Clicking any card navigates to `/posts/<slug>` and renders the full article with Shiki-highlighted code blocks.
- The sidebar shows all 9 categories with live counts; clicking one navigates to `/category/<id>` and shows only posts in that category.
- Tag chips on cards navigate to `/tag/<name>` and show only posts with that tag.
- The topbar search filters the visible card grid as you type, on `/`, `/category/[id]`, and `/tag/[name]`. `/` focuses the input. `Esc` clears it.
- Theme toggle flips between light and dark and persists across reloads. No FOUC on first paint.
- `prefers-reduced-motion` disables the brand-cursor blink and card hover lifts.
- Unknown slug, category, or tag returns the themed 404 page.
- `pnpm build` succeeds. `pnpm validate` (typecheck + lint) is clean.
- A push to `main` triggers a Vercel production deploy and a passing GitHub Actions run on the PR.

When all of the above hold, Phase 1 is done and we move to Phase 2 brainstorm.
