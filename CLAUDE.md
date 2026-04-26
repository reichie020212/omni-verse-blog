# Claude — Omni-Verse Blog

This is **Omni-Verse Blog**, Red's personal blog. Read this file before doing any work on the repo.

## Stack

- **Framework:** Next.js 15 App Router, React 19, React Server Components (RSC) by default
- **Language:** TypeScript strict mode
- **Content:** MDX in `content/posts/` with YAML frontmatter, validated by Zod, rendered via `next-mdx-remote/rsc`
- **Auth:** Auth.js v5 (`next-auth@5.x` beta) with GitHub + Google providers, DB-backed sessions
- **DB:** Drizzle ORM + libsql (`@libsql/client`). Local: `file:local.db`. Self-host (Phase 4b): same client, sqlite file on a mounted volume.
- **Search:** fuse.js client-side; build-time `public/search-index.json`
- **Styling:** `src/styles/globals.css` verbatim from the prototype (`/Users/red/ClaudeDesign/blog/styles.css`). Don't drift the design language unilaterally.
- **Tests:** Vitest (unit + library). Playwright (E2E, lands in Phase 4a).
- **Deploy target:** Self-hosted on Red's Mac mini M4 Pro via Docker Compose + Caddy reverse proxy (Phase 4b). **Not** Vercel, **not** Turso.

## Directory layout

```
content/posts/             ← MDX posts, one per file
public/
  covers/                  ← real JPG covers (optional, fallback to SVG generators)
  search-index.json        ← prebuild artifact
  og/                      ← per-post OG card PNGs (Phase 4a)
scripts/
  build-search-index.ts    ← prebuild step
  migrate-data.ts          ← one-time data.jsx → MDX (already run)
  build-cover-manifest.ts  ← Phase 4a, scans public/covers/
  build-og-cards.ts        ← Phase 4a, satori + resvg-js
src/
  app/                     ← App Router
    @drawer/(.)posts/[slug]/page.tsx   ← intercepted drawer route
    posts/[slug]/page.tsx              ← full-page article
  components/              ← React components, RSC by default
  covers/                  ← per-cover SVG generators (one file each) + manifest.ts (Phase 4a)
  lib/                     ← pure logic + utilities
docs/superpowers/
  specs/                   ← per-phase design specs
  plans/                   ← per-phase implementation plans
drizzle/                   ← generated migrations (committed)
```

## Critical conventions

1. **Pure-impl + server-action split.** When a server action needs unit tests with an in-memory DB, split it: `<name>.ts` (pure functions taking `db` + `userId`, no `'use server'`, no `auth()`) and `<name>-actions.ts` (`'use server'` wrappers calling into the impl). Vitest can't resolve `next/server` through `next-auth`'s import chain. See `src/lib/bookmarks.ts` + `bookmarks-actions.ts` for the pattern.

2. **RSC by default, client islands narrowly.** Only mark `'use client'` for components that genuinely need state, effects, or browser APIs (search input, drawer transitions, theme toggle, like/bookmark buttons, comment form). The grid, sidebar, article body, covers, and topbar shell are server components.

3. **Deterministic SVG covers.** `src/covers/<name>.tsx` generators use `mulberry32` seeded from the post slug (`src/lib/prng.ts`). Never use `Math.random()` in server components — it causes hydration mismatch.

4. **Drawer is a real `<dialog>`.** `PostDrawer` uses native `<dialog>` + `@starting-style` + `transition-behavior: allow-discrete`. Don't replace with a fake-modal div.

5. **Drizzle relations.** Use `relations()` + `db.query.<table>.findMany({ with: { … } })` for joined reads. See `src/lib/schema.ts`.

6. **Test DB.** `src/lib/test-db.ts` exposes `makeTestDb()` (in-memory libsql, applies `drizzle/` migrations). Tests target `*Impl` functions directly, never `auth()`.

## Scripts

- `pnpm dev` — Next.js dev server
- `pnpm build` — runs `db:migrate` → `prebuild` → `next build`
- `pnpm typecheck` — `tsc --noEmit` (treat failures as blocking)
- `pnpm lint` — `next lint`
- `pnpm test` — Vitest run
- `pnpm validate` — typecheck + lint + test
- `pnpm new-post` — interactive post scaffolder (Phase 4a)
- `pnpm db:generate` / `db:migrate` / `db:studio` — Drizzle Kit

## Gotchas

- **`drizzle.config.ts` uses `dialect: 'turso'`**, not `driver` (changed in drizzle-kit 0.31). Never reintroduce a separate `driver` field.
- **`next.config.ts` uses top-level `typedRoutes`**, not `experimental.typedRoutes` (deprecated in Next 15).
- **Don't mask failures with `| tail`.** `pnpm typecheck 2>&1 | tail -5 && git commit …` always passes the `&&` because `tail` exits 0 even when `pnpm` fails. Run typecheck on its own line and check `$?` if you must chain.
- **`node:fs` does not belong in any component path that touches a client tree.** The `<Cover>` JPG fallback uses a build-time manifest (`src/covers/manifest.ts`) — never `fs.existsSync` at render.
- **Markdown subset parser** (`src/lib/markdown.ts`) is regex-based and does NOT support nested markers (`**bold *italic***`). This is documented and intentional. Don't add hacky workarounds — switch to a real tokenizer if nesting is needed.

## Working with Red

- Hybrid execution: solo-dev project. **Skip git worktrees** for direct work; **use them** when dispatching subagents. (Memory: `feedback_worktree_for_subagents.md`.)
- **Trust mode.** Once Red says "go with your recommendations," batch remaining decisions into one message instead of one-question-at-a-time. (Memory: `feedback_compress_decisions.md`.)
- **Commits:** sign with `-s -S`, conventional-commits prefix (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`), no self-attribution.
- **Architect ↔ Executor.** For non-trivial decisions on this project, Gemini is the architect; Claude executes. Re-consult Gemini (`/ask gemini`) on roadblocks rather than improvising design changes. (See Red's global `~/.claude/CLAUDE.md` for the full division-of-labor rules.)

## Phase status

- **Phase 1** (static MVP): merged, `cb06783`
- **Phase 2** (drawer/progress/related/sort/search): merged, `ea2d439`
- **Phase 3** (auth/DB/likes/bookmarks/comments): merged, `9dfa055`
- **Phase 4a** (CLI, OG/SEO/RSS, JPG covers, Lighthouse, a11y, E2E, docs): in progress
- **Phase 4b** (self-host: Docker, compose, Caddy, backups, OAuth callbacks): pending

Specs and plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.
