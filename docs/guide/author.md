# Author's guide

How to write, preview, and publish a post on Omni-Verse Blog. Pair this with [`CONTRIBUTING.md`](../../CONTRIBUTING.md) (the schema reference) and [`README.md`](../../README.md) (scripts + env setup).

## The whole loop in one screen

```
pnpm new-post           # scaffold a draft
$EDITOR content/posts/<slug>.mdx
pnpm dev                # live preview at http://localhost:3000
# write, save, repeat — Next picks up changes via HMR

# when you're happy:
#   set readTime to a real estimate
#   set draft: false
git add content/posts/<slug>.mdx
git commit -s -S -m "post: <title>"
git push                # CI runs pnpm validate
```

In production (Phase 4b on the Mac mini), the post goes live on the next `docker compose build web && docker compose up -d`.

## `pnpm new-post`

The CLI scaffolds a valid MDX file with frontmatter that already passes `PostFrontmatterSchema`, so you can't get the metadata wrong by accident.

```
$ pnpm new-post
┌  New post
│
◇  Title
│  A brief defense of tabs over spaces
│
◇  Slug
│  a-brief-defense-of-tabs-over-spaces
│
◇  Excerpt
│  I am not picking a fight. I am simply correct.
│
◇  Category
│  Programming
│
◇  Tags (comma-separated)
│  style, opinion
│
◇  Size
│  medium (default)
│
◇  Cover
│  tabs
│
└  ✓ wrote content/posts/a-brief-defense-of-tabs-over-spaces.mdx
```

Each prompt has its own validation. If you escape (<kbd>Ctrl</kbd>+<kbd>C</kbd>) at any prompt, nothing is written. If a file with the chosen slug already exists, the CLI refuses to overwrite — pick a different slug.

The CLI auto-generates the post `id` (a `0x<3 hex>` slug-independent identifier) by reading every existing post and picking `max + 1`. You don't need to think about it.

## What the file looks like

The CLI emits this:

```mdx
---
id: '0x4f3'
slug: 'a-brief-defense-of-tabs-over-spaces'
title: "A brief defense of tabs over spaces"
excerpt: "I am not picking a fight. I am simply correct."
category: programming
tags: [style, opinion]
date: 2026-04-27
readTime: 1
size: medium
cover: tabs
draft: true
---

Write your post here.
```

The fields:

| Field | Notes |
|---|---|
| `id` | `0x<3 hex>` — auto, unique per post. Don't edit. |
| `slug` | kebab-case, must equal the filename without `.mdx`. |
| `title` | What appears as `<h1>` and in `<title>`. Keep it ≤200 chars. |
| `excerpt` | 1–2 sentence summary. Shows in cards, the OG card, the Atom feed, and search results. Keep it ≤300 chars. |
| `category` | One of `tech`, `programming`, `celestial`, `family`, `travel`, `books`, `food`, `essays`. Add to `content/categories.ts` if you need a new one. |
| `tags` | Free-form. Each ≤30 chars. Tags become `/tag/<name>` pages. |
| `date` | `YYYY-MM-DD`. Defaults to today; bump it manually if you want to backdate or schedule. |
| `readTime` | Integer minutes. Update once the body is written (1 min ≈ 200 words). The CLI seeds `1` so you remember to revisit. |
| `size` | `hero`, `wide`, `medium`, `small` — controls the magazine card on the home grid. |
| `cover` | One of the 14 SVG generator keys (see below) or a JPG filename in `public/covers/`. |
| `featured` | Optional boolean. `true` promotes the post to the home hero slot regardless of date. |
| `draft` | `true` hides the post from `getAllPosts()` lists, sitemap, RSS, and the homepage. Flip to `false` to publish. |

The frontmatter is validated against `PostFrontmatterSchema` in `src/lib/posts.ts` on every build. A typo (e.g., `category: programing`) fails the build with a clear error.

## MDX features

The blog's MDX pipeline is `next-mdx-remote/rsc` + `gray-matter` + `rehype-slug` + `rehype-pretty-code` (Shiki).

What works:

- **Headings** — `#`, `##`, `###`. Each gets an auto-generated `id` via `rehype-slug` so you can deep-link to a section.
- **Code blocks with language hints** — Shiki highlights against a GitHub-derived theme. Use triple-backtick blocks: `` ```ts `` etc.
- **Lists, blockquotes, tables, links** — standard CommonMark, no surprises.
- **Inline `<img>`** — for screenshots inside the body. Cover images use the dedicated `cover:` frontmatter, not body images.

What doesn't (intentionally):

- **Custom React components in MDX.** Not currently wired up. Add only if a post truly needs interactivity — for now, it's plain prose + code.
- **Nested markdown markers** (e.g., `**bold *italic***`) in *comments*. The comment renderer is a small regex parser and only handles flat markers. Posts use the full MDX renderer and don't have this limitation.

## Cover options

Two paths.

**SVG generator (default).** Pick one of the 14 deterministic generators in `src/covers/`:

`jovian`, `rust`, `pancakes`, `config`, `notebook`, `tabs`, `lisbon`, `book`, `web`, `pluto`, `caldo`, `teach`, `sqlite`, `paint`.

Each one is a hand-tuned SVG component seeded by the post slug — the same slug always produces the same cover. The `pnpm new-post` CLI offers these as a select.

**JPG cover.** Drop a 1200×630 JPG named `<slug>.jpg` into `public/covers/`. The next build's `prebuild` step (`scripts/build-cover-manifest.ts`) regenerates `src/covers/manifest.ts`, and the `<Cover>` component automatically prefers the JPG over the SVG generator. No frontmatter change required — just match the slug.

JPG covers go through `next/image`, so they're responsive and lazy by default. The hero slot uses `priority` so it's eligible for LCP.

## OG cards

Every published post gets a 1200×630 OG card auto-generated from its title at build time (`scripts/build-og-cards.ts`, satori + resvg-js). The image is at `public/og/<slug>.png` and is referenced by the per-post `openGraph.images` in metadata.

You don't need to do anything for this — it Just Works on the next build. The card layout is defined in the script; tweak there if you want to change the look.

## Draft → publish

While `draft: true`:
- The post **does** appear when you `pnpm dev` (so you can preview).
- The post **does not** appear in `getAllPosts()` filtered for production, sitemap, RSS feed, or the homepage grid.

To publish:

1. Set `readTime` to a realistic number.
2. Flip `draft: true` → `draft: false`.
3. Commit + push. CI runs `pnpm validate`.
4. Production deploy picks it up (Phase 4b: `git pull && docker compose build web && docker compose up -d`).

Backdating is fine — set `date` to whatever you like. The post still publishes on the next build; the date just affects sort order.

## Validating before commit

```bash
pnpm validate     # typecheck + lint + Vitest (the standard pre-commit gate)
```

`pnpm validate` will catch frontmatter schema mismatches, slug/filename divergence, and TypeScript regressions. It does **not** catch:

- Visual regressions in MDX rendering — preview with `pnpm dev`.
- Cover image absence (JPG cover specified but missing) — manifest regeneration during build will silently fall through to the SVG generator.

If you're touching anything beyond a single post (e.g., editing components, schema, server actions), also run:

```bash
pnpm e2e          # full Playwright suite (~50s; requires `pnpm exec playwright install chromium` once)
```

## Adding a new category

If you need a category that isn't on the existing list, edit [`content/categories.ts`](../../content/categories.ts):

```ts
export const CATEGORIES = [
  { id: 'all',         label: 'All posts'   },
  // ... existing ...
  { id: 'photography', label: 'Photography' }, // new
] as const;
```

The schema, the CLI, the sidebar, and the routing all read from this single source of truth — no other file to touch.

## Quick troubleshooting

- **`pnpm new-post` errors on slug.** The auto-derivation strips non-alphanumerics. Titles that are mostly punctuation (`!!!`) yield empty slugs and get rejected. Override the slug in the second prompt.
- **Build fails with `frontmatter slug "..." does not match filename`.** You renamed either the file or the `slug:` frontmatter without updating the other. Make them match.
- **Post doesn't show on the home page.** Check `draft: false`. In production, drafts are filtered out at build.
- **Cover doesn't render.** If you specified a JPG cover but the file isn't in `public/covers/<slug>.jpg`, the manifest won't include it and `<Cover>` falls through to the SVG generator. Check the file exists with the correct name.
- **OG image stale after edits.** OG cards are regenerated when the post's MDX file is newer than the existing PNG. If you're seeing the wrong image cached on social, run `rm -rf public/og && pnpm build` to force-regenerate, then re-share the link (some platforms cache aggressively for 24h).

That's the whole authoring loop. The reader's side is in [reader.md](./reader.md).
