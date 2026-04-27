# Contributing

This is a personal blog, so "contributing" really means "Red writes posts." This doc is the schema reference; for a screenshot-rich walkthrough see [`docs/guide/author.md`](./docs/guide/author.md).

## Authoring a new post

Posts live in the `posts` table; you write and publish them from the website itself, no redeploy required.

1. Sign in as an admin (set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env.local`, or `UPDATE "user" SET role='admin' WHERE id=...` on an existing account).
2. Visit `/admin/posts`.
3. Click **+ New post**, fill the form, and submit.

The form covers every field in the post schema. The hex `id` is auto-generated as `max(existing) + 1`. After save, the home page, post detail, sitemap, search index, and OG card update on the next request.

## Post schema

| Field | Type | Notes |
|---|---|---|
| `id` | `0x<3 hex>` | Auto-generated, unique across posts |
| `slug` | kebab-case | Set on create; not editable afterwards |
| `title` | string | |
| `excerpt` | string | 1–2 sentence summary; appears in cards, search, OG cards |
| `category` | enum | tech, programming, celestial, family, travel, books, food, essays |
| `tags` | string[] | Comma-separated in the form |
| `date` | YYYY-MM-DD | Defaults to today |
| `readTime` | int | Minutes — update once content is written |
| `size` | enum | `hero` / `wide` / `medium` / `small` (controls the homepage card) |
| `cover` | string | Generator key or `<slug>.jpg` in `public/covers/` |
| `featured` | bool | Promotes to the home hero |
| `draft` | bool | `true` hides from lists, sitemap, feed |

The full Zod schema is in `src/lib/posts-admin.ts` (`PostInputSchema`).

## MDX features in the body

- Headings (`#`, `##`, `###`) — auto-IDs via `rehype-slug`
- Code blocks with language hints — Shiki via `rehype-pretty-code`
- Lists, blockquotes, tables, links — standard
- Images — `<img>` works; for hero/cover use a JPG in `public/covers/`

Custom React components in MDX are not currently wired up.

## Cover options

**SVG generator (default).** Pick one of the existing generator keys: `jovian`, `rust`, `pancakes`, `config`, `notebook`, `tabs`, `lisbon`, `book`, `web`, `pluto`, `caldo`, `teach`, `sqlite`, `paint`. Generators are deterministic — same slug yields the same cover.

**JPG cover.** Drop a JPG named `<slug>.jpg` into `public/covers/`. The next build's `prebuild` step regenerates `src/covers/manifest.ts`, and `<Cover>` automatically prefers the JPG over the SVG generator. JPG covers should be ≥1200×630 at 72dpi.

## MDX fixtures (`content/posts/*.mdx`)

The MDX files in `content/posts/` are no longer the canonical content source — they're kept as **fixtures** for E2E tests (`e2e/global-setup.ts` calls `pnpm migrate:posts` to seed `e2e.db`) and as a recovery backup. They are NOT updated when you edit a post via `/admin/posts`. The DB is the source of truth.

If you need to roll back to a known-good MDX corpus (e.g., DB corruption), `pnpm migrate:posts` re-seeds the production DB from the in-tree fixtures.

## Publishing flow

1. Create a post with `draft: true`.
2. Write the body. Bump `readTime` once the content is settled.
3. Uncheck `draft` and save. The post appears immediately on the public site.

## Running tests

```bash
pnpm validate  # typecheck + lint + Vitest
pnpm e2e       # Playwright (slow, requires `pnpm exec playwright install chromium` once)
```

`pnpm validate` is the gate before every commit. `pnpm e2e` is the gate before pushing changes that touch UI or auth.
