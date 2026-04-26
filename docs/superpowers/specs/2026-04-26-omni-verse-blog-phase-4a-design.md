# Omni-Verse Blog — Phase 4a Design

**Date:** 2026-04-26
**Author:** Red (with Claude)
**Status:** Approved
**Predecessors:** Phase 1 (`cb06783`), Phase 2 (`ea2d439`), Phase 3 (`9dfa055`)
**Successor:** Phase 4b (self-host: Docker Compose, Caddy, sqlite-volume backups, OAuth callback wiring)

---

## 1. Goal

Take the Phase 3 codebase from "feature-complete locally" to "polished, accessible, discoverable, and authorable from the CLI." All work in this phase is additive: no new pages, no new business logic, no schema changes. Existing tests stay green.

The deliverable is a blog that is ready to be self-hosted in Phase 4b — meaning every piece of the application surface that is independent of the deploy target lands here.

---

## 2. Scope

### In scope

1. **Authoring CLI** (`pnpm new-post`)
2. **SEO + social surface** — per-post metadata, sitemap.xml, robots.txt, Atom feed
3. **Build-time assets** — OG card PNGs, JPG cover manifest, reduced-motion CSS audit
4. **E2E + a11y harness** — Playwright + `@axe-core/playwright`
5. **Hardening + docs** — env validation, security headers, README/CONTRIBUTING/MIGRATION, Lighthouse baseline

### Out of scope (Phase 4b)

- Dockerfile, `docker-compose.yml`, Caddy config, OAuth production callback URLs
- Backup scripts for the sqlite volume
- CI workflow file (`.github/workflows/ci.yml`)
- Strict CSP (set at the Caddy layer in 4b once the production hostname is known)

None of these are blocked by 4a. Phase 4a's outputs are deploy-target agnostic.

---

## 3. Architecture

Phase 4a is delivered as five independently-committable vertical slices, in approximately this order. Each slice ends with a clean test run and a commit.

```
Slice 1: Env validation        (src/lib/env.ts, zod schema, .env.example update)
Slice 2: Authoring CLI         (scripts/new-post.ts)
Slice 3: SEO + social surface  (metadata, sitemap, robots, feed)
Slice 4: Build-time assets     (cover manifest, OG cards, reduced-motion audit)
Slice 5: E2E + a11y            (Playwright config + 6 specs + axe-core)
Slice 6: Hardening + docs      (security headers, README, CONTRIBUTING, MIGRATION, Lighthouse)
```

Env validation moves to Slice 1 because Slice 3 (SEO surface) needs `env.SITE_URL`. The slices are otherwise independent — sequencing prefers low-risk surface work and ends with cross-cutting concerns (headers + docs that summarize everything).

---

## 4. Slice 1 — Env validation

### Goal

Centralize all `process.env` reads behind a zod-validated `env` export. Required for Slice 3 (sitemap/robots/feed need `SITE_URL`) and the production safety check that prevents the E2E Credentials provider from running in production.

### File

**Create:** `src/lib/env.ts`

```ts
import { z } from 'zod';

const schema = z.object({
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be ≥32 chars; run `pnpm auth:secret`'),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  DATABASE_URL: z.string().default('file:local.db'),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  SITE_URL: z.string().url().default('http://localhost:3000'),
  E2E_TEST: z.enum(['0', '1']).default('0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = schema.parse(process.env);

if (parsed.NODE_ENV === 'production' && parsed.E2E_TEST === '1') {
  throw new Error('E2E_TEST=1 is not allowed in production');
}

export const env = parsed;
export const envSchema = schema; // exported for testing
```

### Migration

- `src/lib/auth.ts` switches `process.env.AUTH_*` reads to `env.AUTH_*`
- `src/lib/db.ts` switches `process.env.DATABASE_*` reads to `env.DATABASE_*`
- `.env.example` updated with `SITE_URL`, `E2E_TEST` (defaults documented inline)

### Testing

`src/lib/env.test.ts` imports `envSchema` (not the side-effecting `env`). Cases:
- Valid full env → parses cleanly
- Missing `AUTH_SECRET` → throws with helpful message
- `AUTH_SECRET` too short → throws
- `SITE_URL` not a URL → throws
- Defaults populate correctly when optionals omitted

The production-safety check (`NODE_ENV=production` + `E2E_TEST=1`) is tested by directly invoking the same conditional logic in a separate test, not by importing the side-effecting module.

---

## 5. Slice 2 — Authoring CLI

### Goal

`pnpm new-post` interactively scaffolds a new MDX post with valid frontmatter, written to `content/posts/<slug>.mdx`.

### File layout

- **Create:** `scripts/new-post.ts` — entry point
- **Modify:** `package.json` — add `"new-post": "tsx scripts/new-post.ts"` script
- **Add dep:** `@clack/prompts` (devDependencies)

### Behavior

Prompts in this order:

| Prompt | Type | Validation |
|---|---|---|
| Title | text | non-empty, max 200 chars |
| Excerpt | text | non-empty, max 300 chars |
| Category | select from `CATEGORIES` | required |
| Tags | text (comma-separated) | each tag ≤30 chars |
| Size | select: `hero`, `wide`, `medium`, `small` | default `medium` |
| Cover | select from cover keys (SVG generators + JPGs in manifest) | required |

**Slug derivation.** Lowercase, replace non-alphanumeric with `-`, collapse runs of `-`, trim leading/trailing `-`. Show derived slug after title prompt; allow override.

**ID derivation.** Read all existing posts via `getAllPosts()`, parse each `id` (format: `0x<3 lowercase hex chars>`), pick `Math.max(...) + 1` and re-format as `0x<3 lowercase hex chars>` (zero-padded). If the result would overflow `0xfff`, abort with an error (not expected for the lifetime of this blog).

**Frontmatter written:**

```yaml
---
id: <derived hex id>
slug: <derived>
title: <input>
excerpt: <input>
category: <selected>
tags: [<comma-split>]
date: <today ISO YYYY-MM-DD>
readTime: 1
size: <selected>
cover: <selected>
draft: true
---

Write your post here.
```

**Conflict handling.** If `content/posts/<slug>.mdx` already exists, abort with a clear error before writing anything.

**Validation.** Use the existing `PostFrontmatterSchema` from `src/lib/posts.ts` to validate the assembled frontmatter before writing — this guarantees CLI-produced posts will load successfully.

### Testing

- `scripts/new-post.test.ts`: extract the slug derivation and frontmatter assembly into pure functions and unit-test those. The interactive shell prompts are not unit-tested.

---

## 6. Slice 3 — SEO + social surface

### Goal

Make the blog discoverable and shareable: per-post metadata with proper OG/Twitter cards, sitemap, robots, Atom feed.

### Site-wide metadata (`src/app/layout.tsx`)

Replace the existing `metadata` export with:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),  // see env validation slice
  title: {
    default: 'Omni-Verse Blog',
    template: '%s — Omni-Verse Blog',
  },
  description: "A blog about tech, programming, celestial bodies, family, and whatever else won't leave my head.",
  openGraph: {
    type: 'website',
    siteName: 'Omni-Verse Blog',
    title: 'Omni-Verse Blog',
    description: '...',
    images: ['/og/default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Omni-Verse Blog',
    description: '...',
    images: ['/og/default.png'],
  },
};
```

`SITE_URL` defaults to `http://localhost:3000` in development; set explicitly in production.

### Per-post metadata (`src/app/posts/[slug]/page.tsx`)

Extend the existing `generateMetadata`:

```ts
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      authors: ['Red'],
      tags: post.tags,
      images: [`/og/${post.slug}.png`],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [`/og/${post.slug}.png`],
    },
  };
}
```

### Sitemap (`src/app/sitemap.ts`)

Next 15 convention. Returns a `MetadataRoute.Sitemap` containing:

- Home (`/`) — priority 1.0, lastModified = newest post date
- `/search` — priority 0.5
- One entry per `CATEGORIES` member at `/category/<id>`
- One entry per unique tag across published posts at `/tag/<name>`
- One entry per **published** (non-draft) post at `/posts/<slug>`, lastModified = post date

Drafts and the auth-gated `/bookmarks` are excluded.

### Robots (`src/app/robots.ts`)

Next 15 convention. Allow all user agents, link the sitemap.

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${env.SITE_URL}/sitemap.xml`,
  };
}
```

### Atom feed (`src/app/feed.xml/route.ts`)

A `GET` route handler returning an Atom 1.0 feed of the latest 30 published posts.

- Excerpt only in `<summary>`, not full body
- Atom (not RSS 2.0) — better validation, modern readers prefer it
- `Content-Type: application/atom+xml`
- `Cache-Control: s-maxage=3600, stale-while-revalidate=86400`

### Testing

- `src/lib/feed.ts` (extracted): `buildAtomFeed(posts, siteUrl)` returning a string. Unit-tested for valid XML structure, correct entry count, escaping of titles/excerpts containing `<`, `&`.
- Sitemap and robots are thin enough to test by snapshot in vitest.

---

## 7. Slice 4 — Build-time assets

### Goal

Two new prebuild outputs (cover manifest, OG cards) and a CSS audit pass for reduced motion.

### Cover manifest

**Problem.** Phase 1 had to remove `fs.existsSync` from `<Cover>` because it leaked `node:fs` into the client bundle (the cover component is reachable from a client-component grid). The fix is a build-time scan that emits a TS literal.

**Files:**
- **Create:** `scripts/build-cover-manifest.ts` — reads `public/covers/*.jpg`, writes `src/covers/manifest.ts`
- **Modify:** `src/components/Cover.tsx` — import `JPG_COVERS` from manifest, branch on `JPG_COVERS.has(slug)`
- **Modify:** `package.json` — prebuild order becomes `cover-manifest → og-cards → search-index`

**Manifest shape:**

```ts
// src/covers/manifest.ts (auto-generated, do not edit)
export const JPG_COVERS = new Set<string>([
  // populated from public/covers/*.jpg
]);
```

**`<Cover>` logic:**

```
if (JPG_COVERS.has(slug)):
  <Image src={`/covers/${slug}.jpg`} alt={post.title} fill />
else if (slug in COVER_GENERATORS):
  <COVER_GENERATORS[slug] size={size} seed={slug} />
else:
  <DefaultCover seed={slug} size={size} />
```

The first branch uses `next/image` so JPGs are responsive and lazy by default.

### OG cards

**Files:**
- **Create:** `scripts/build-og-cards.ts` — reads all posts, renders one card each
- **Add deps:** `satori`, `@resvg/resvg-js` (devDependencies)

**Layout (1200×630):**

- Background: tinted version of the post's cover (rendered at 30% opacity over a theme-color base) OR solid theme accent if no cover
- Top-left: Ω brand mark in a rounded square (matching the topbar mark)
- Center-left: post title in the prototype's serif font, max 3 lines, auto-shrunk by char count
- Below title: reading time + date in mono
- Bottom-right: `~/omni-verse` wordmark

**Font loading.** The script reads `Source Serif Pro` + `JetBrains Mono` `.ttf` files from `assets/fonts/` (committed once, ~400KB total) into `ArrayBuffer`s at runtime. `satori` consumes them as `{ name, data, weight, style }` entries. Fonts are not embedded as base64 strings in code — that would bloat per-commit diffs.

**Output.** `public/og/<slug>.png` for each post + `public/og/default.png` for site-level routes.

**Idempotency.** Skip generation if `public/og/<slug>.png` exists and is newer than the source MDX file's mtime. Full rebuild via `pnpm build` always runs the script; the mtime check is just a fast-path.

### Reduced-motion audit

**Files:**
- **Modify:** `src/styles/globals.css` — extend existing `@media (prefers-reduced-motion: reduce)` blocks
- **Create:** `src/lib/reduced-motion.test.ts` — regression check that key rules exist

**Rules to add (if missing):**

- Drawer slide → fade only (`transform: none`, `transition: opacity`)
- Topbar blinking cursor → static (`animation: none`)
- Card hover lifts → off (`transform: none` on `:hover`)
- Sidebar nav hover lifts → off
- `html { scroll-behavior: auto }` (override `smooth`)

**Test.** Read `globals.css` as a string in vitest, assert the rules exist (regex matches). Cheap regression catcher; not perfect, but catches accidental deletions.

---

## 8. Slice 5 — E2E + a11y

### Goal

Playwright suite covering the critical user flows, with axe-core accessibility checks baked in.

### Files

- **Create:** `playwright.config.ts` at repo root
- **Create:** `e2e/` directory with one spec per flow + a `helpers.ts`
- **Create:** `e2e/fixtures/test-user.ts` — fixed test user data
- **Modify:** `src/lib/auth.ts` — add Credentials provider gated on `env.E2E_TEST === '1'`
- **Modify:** `package.json` — add `"e2e": "playwright test"` script (NOT in `validate`)
- **Add deps:** `@playwright/test`, `@axe-core/playwright`

### Playwright config

```ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,            // shared sqlite, sequential is safest
  workers: 1,
  retries: 0,
  webServer: {
    command: 'pnpm build && E2E_TEST=1 pnpm start',
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: false,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
```

### Auth strategy

Add a Credentials provider in `src/lib/auth.ts`:

```ts
const providers = [GitHub, Google];
if (env.E2E_TEST === '1' && env.NODE_ENV !== 'production') {
  providers.push(Credentials({
    name: 'E2E Test',
    credentials: { email: { label: 'Email', type: 'email' } },
    authorize: async (c) => {
      if (c?.email !== 'e2e@test.local') return null;
      // upsert user, return { id, email, name }
    },
  }));
}
```

The provider is **only active when `E2E_TEST=1`**, never in production builds. This is enforced by the env validation slice (production refuses to start with `E2E_TEST=1`).

### Specs

| File | Flow | a11y check |
|---|---|---|
| `e2e/home.spec.ts` | Load `/`, hero + grid render, sidebar present | Yes, on `/` |
| `e2e/drawer.spec.ts` | Click card → drawer opens, URL updates, Escape closes, scroll restored | Yes, on drawer-open state |
| `e2e/category-filter.spec.ts` | Sidebar category click filters grid | No (not visual change) |
| `e2e/search.spec.ts` | Type in topbar → live filter; Enter → `/search?q=…` | Yes, on `/search` |
| `e2e/bookmark.spec.ts` | Anon bookmark localStorage → sign-in via Credentials → merge → `/bookmarks` lists it | Yes, on `/bookmarks` |
| `e2e/comment.spec.ts` | Sign-in → `/posts/<slug>` → add comment → see it → delete it | No (already covered) |

Each visual spec runs `injectAxe()` then `await checkA11y(page, null, { detailedReport: false, axeOptions: { rules: { 'color-contrast': { enabled: true } } } })`. Fails on `serious` and `critical` violations only. `incomplete` and `moderate` are reported but don't fail.

### Test data

The test database is `e2e.db` (separate from dev's `local.db`), set via `DATABASE_URL=file:e2e.db` in the `webServer` env. This avoids polluting dev data and keeps cleanup trivial.

`e2e/global-setup.ts` runs once before all specs:
- `rm -f e2e.db` (fresh DB each run)
- Apply migrations (`drizzle-kit migrate` or programmatic equivalent)
- Insert the test user (`{ email: 'e2e@test.local', name: 'E2E', id: 'e2e-user' }`)

Each spec is responsible for its own fixtures:
- `bookmark.spec.ts` starts unauthenticated (localStorage-only) and creates state during the test
- `comment.spec.ts` adds a comment in the test, asserts, then deletes it within the same test

`e2e.db` is gitignored. Specs run sequentially (`workers: 1`) so cross-spec state isn't an issue.

### CI implications

`pnpm e2e` is **not** part of `pnpm validate`. Running it requires Playwright browsers (`pnpm exec playwright install`) and a build, both slow. `pnpm validate` stays the fast pre-commit gate; `pnpm e2e` is the slower pre-push gate.

---

## 9. Slice 6 — Hardening + docs

### Security headers

**File:** `next.config.ts`

```ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  output: 'standalone',  // for Phase 4b Docker image
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    return [{
      source: '/:path*',
      headers: [
        ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
```

`output: 'standalone'` is included now (Phase 4a) so Phase 4b's Dockerfile is a one-line `COPY` of `.next/standalone`. Cheap, no-cost addition.

Strict CSP is **not** added here — it's brittle without knowing the exact production hostname and the inline-script hash for theme bootstrap. Phase 4b sets CSP at the Caddy layer.

### README.md

~80 lines. Sections:

1. **Intro** — one paragraph on what the blog is
2. **Quick start** — clone, `pnpm install`, copy `.env.example` to `.env.local`, generate AUTH_SECRET, OAuth setup pointers, `pnpm db:migrate`, `pnpm dev`
3. **Scripts table** — all scripts with one-line descriptions
4. **Env vars table** — all vars from `env.ts` with default + meaning
5. **Authoring** — single sentence: "see CONTRIBUTING.md"
6. **Tests** — `pnpm test`, `pnpm e2e` (latter requires `pnpm exec playwright install`)
7. **Phase status** — links to specs/plans
8. **License** — MIT

### CONTRIBUTING.md

~60 lines. Sections:

1. **Authoring a new post** — `pnpm new-post`, prompt-by-prompt walkthrough
2. **Frontmatter schema** — full table of fields with types and meaning
3. **MDX features** — what works (code blocks via Shiki, headings, lists, links), what doesn't (custom components — none yet)
4. **Cover options** — SVG generators (existing keys listed) vs. drop-in JPG (where to put it, naming convention)
5. **Draft → publish** — flip `draft: true` to `false`, post appears in lists/sitemap/feed
6. **Running tests** — `pnpm test`, `pnpm e2e`

### MIGRATION.md

~40 lines. Sections:

1. **Deviations from prototype** — bulleted list:
   - Native `<dialog>` for the post drawer (vs. div-based modal in prototype)
   - Parallel-route + intercepted-route drawer architecture (vs. modal state in prototype)
   - Removed `tweaks-panel.jsx` (dev-only, doesn't ship)
   - Replaced `Math.random()` cover variation with mulberry32 + slug seed (deterministic, no hydration mismatch)
   - Markdown subset parser does not support nested markers (documented limitation)
2. **Lighthouse baseline** — measured numbers for `/` and `/posts/a-week-in-lisbon-mostly-by-foot`, all four categories
3. **Not yet ported** — anything intentionally excluded

### Lighthouse pass

**Procedure:**

```bash
pnpm build
pnpm start &
pnpm exec lighthouse http://localhost:3000/ \
  --output=json --output-path=./lighthouse-home.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless"
pnpm exec lighthouse http://localhost:3000/posts/a-week-in-lisbon-mostly-by-foot \
  --output=json --output-path=./lighthouse-post.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless"
```

**Target:** ≥95 on Performance, Accessibility, Best Practices, SEO for both URLs.

**Recorded in MIGRATION.md.** No CI gate. JSON outputs gitignored.

If a target is missed, fix and re-measure. Common likely wins:
- `<Image>` for any remaining raw `<img>`
- `font-display: swap` on serif/mono webfonts
- Preload key fonts
- Verify all images have explicit width/height (no CLS)

---

## 10. Risks and trade-offs

| Risk | Mitigation |
|---|---|
| Satori/resvg adds ~30MB to devDependencies | Devs only; production build uses the prebuild output, not the script |
| OG card font embedding bloats per-commit diffs | Fonts vendored once to `assets/fonts/` and read from disk in the script, not embedded as base64 |
| Playwright with `workers: 1` is slow | Acceptable for this size (~6 specs); separate from `pnpm validate` |
| Credentials provider for E2E broadens auth surface | Gated on env var **and** `NODE_ENV !== 'production'`; env validation refuses prod start with the flag set |
| Reduced-motion test is a regex check, not a real CSS-in-DOM test | Better than nothing; catches accidental deletions; full DOM-rendered check would require a JSDOM setup not currently in the repo |
| `output: 'standalone'` changes the build directory layout | Verified with `pnpm build && pnpm start` in 4a; Phase 4b can rely on it |

---

## 11. Acceptance criteria

Phase 4a is done when:

- [ ] `pnpm new-post` creates a valid MDX file end-to-end; conflict detection works
- [ ] Site has `<title>`, description, OG, and Twitter meta on `/`, `/posts/[slug]`, and other key routes
- [ ] `/sitemap.xml`, `/robots.txt`, and `/feed.xml` validate against their respective spec validators
- [ ] OG card PNGs exist for every published post under `public/og/`; default exists too
- [ ] Cover manifest auto-generates; dropping a JPG into `public/covers/` and rebuilding makes it appear on the post
- [ ] `prefers-reduced-motion` audit checks pass
- [ ] `pnpm e2e` runs all 6 specs green; axe-core reports 0 serious/critical violations on tested routes
- [ ] `src/lib/env.ts` zod-validates `process.env`; production refuses to start with `E2E_TEST=1`
- [ ] All security headers present in production responses
- [ ] README, CONTRIBUTING, MIGRATION committed; MIGRATION includes Lighthouse baseline
- [ ] Lighthouse: ≥95 on P/A/BP/SEO for `/` and one representative post
- [ ] Existing 10 vitest suites still pass; `pnpm validate` green

---

## 12. Phase 4b preview (informational)

Phase 4b's spec will cover:
- `Dockerfile` (multi-stage: deps → build → runner; uses `output: 'standalone'`)
- `docker-compose.yml` (Next.js + Caddy services + sqlite volume)
- `Caddyfile` with auto-HTTPS via Let's Encrypt
- OAuth callback URL configuration for production hostname
- `AUTH_TRUST_HOST=true`
- Backup script: nightly `cp local.db backups/local.db.$(date +%F)` to a Time Machine target
- (Optional) `.github/workflows/ci.yml` running `pnpm validate` on push

That work is **not** in 4a, but 4a's `output: 'standalone'` and env validation make 4b a much shorter spec.
