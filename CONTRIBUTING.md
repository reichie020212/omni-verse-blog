# Contributing

This is a personal blog, so "contributing" really means "Red writes posts." This doc covers the post authoring workflow.

## Authoring a new post

```bash
pnpm new-post
```

The CLI prompts for:

1. **Title** — full post title; max 200 chars.
2. **Slug** — auto-derived from the title, kebab-case. Override only if the auto-derivation is wrong.
3. **Excerpt** — 1–2 sentence summary; max 300 chars; appears in cards, search, and OG cards.
4. **Category** — one of: tech, programming, celestial, family, travel, books, food, essays.
5. **Tags** — comma-separated; each tag ≤30 chars.
6. **Size** — `medium` (default), `small`, `wide`, `hero`. Controls the card on the homepage grid.
7. **Cover** — one of the SVG generator keys: `jovian`, `rust`, `pancakes`, `config`, `notebook`, `tabs`, `lisbon`, `book`, `web`, `pluto`, `caldo`, `teach`, `sqlite`, `paint`.

The CLI writes `content/posts/<slug>.mdx` with `draft: true` so the post is hidden until you flip it.

## Frontmatter schema

| Field | Type | Notes |
|---|---|---|
| `id` | `0x<3 hex>` | Auto-generated, unique across posts |
| `slug` | kebab-case | Must match the filename |
| `title` | string | |
| `excerpt` | string | |
| `category` | enum | See list above |
| `tags` | string[] | |
| `date` | YYYY-MM-DD | Defaults to today |
| `readTime` | int | Update once content is written |
| `size` | enum | `hero` / `wide` / `medium` / `small` |
| `cover` | string | Generator key (see above) or `<slug>.jpg` filename in `public/covers/` |
| `featured` | bool? | Promotes to home hero |
| `draft` | bool? | `true` hides from lists, sitemap, feed |

## MDX features

- Headings (`#`, `##`, `###`) — auto-IDs via `rehype-slug`
- Code blocks with language hints — Shiki via `rehype-pretty-code` (uses the prototype's GitHub-derived theme)
- Lists, blockquotes, tables, links — standard
- Images — `<img>` works, but for hero/cover use a JPG in `public/covers/`

Custom React components in MDX are not currently wired up. Add only if a post truly needs interactivity beyond static HTML.

## Cover options

**SVG generator (default).** Pick one of the existing generator keys in the `cover` frontmatter field. Generators are deterministic — same slug yields the same cover every build.

**JPG cover.** Drop a JPG named `<slug>.jpg` into `public/covers/`. The next build's `prebuild` step regenerates `src/covers/manifest.ts`, and `<Cover>` automatically prefers the JPG over the SVG generator. JPG covers should be ≥1200×630 at 72dpi.

## Publishing

1. Write the body.
2. Update `readTime` to a realistic estimate (1 min ≈ 200 words).
3. Flip `draft: true` to `false`.
4. Commit and push. The post appears in lists, sitemap, RSS feed, and the homepage grid on the next build.

## Running tests

```bash
pnpm validate  # typecheck + lint + Vitest
pnpm e2e       # Playwright (slow, requires `pnpm exec playwright install chromium` once)
```

`pnpm validate` is the gate before every commit. `pnpm e2e` is the gate before pushing changes that touch UI or auth.
