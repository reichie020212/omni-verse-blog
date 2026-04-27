# Claude — Omni-Verse Blog

This is **Omni-Verse Blog**, Red's personal blog. Read this file before doing any work on the repo.

## Stack

- **Framework:** Next.js 15 App Router, React 19, React Server Components (RSC) by default
- **Language:** TypeScript strict mode
- **Content:** Posts live in the libsql `posts` table; MDX bodies are rendered via `next-mdx-remote/rsc` at request time. `content/posts/*.mdx` are kept in-tree as **fixtures** (E2E global-setup re-seeds from them via `pnpm migrate:posts`) and as a recovery backup, but they are not the canonical source — admin edits via `/admin/posts` write straight to the DB.
- **Auth:** Auth.js v5 (`next-auth@5.x` beta) with GitHub + Google + username/password providers, DB-backed sessions, role-gated admin (`users.role = 'admin'`).
- **DB:** Drizzle ORM + libsql (`@libsql/client`). Local: `file:local.db`. Self-host: same client, sqlite file on a host bind mount (`./data/local.db`).
- **Search:** fuse.js client-side; live `data/search-index.json` regenerated on every admin write and served via `/api/search-index.json`.
- **Styling:** `src/styles/globals.css` verbatim from the prototype (`/Users/red/ClaudeDesign/blog/styles.css`). Don't drift the design language unilaterally.
- **Tests:** Vitest (unit + library) — 123 tests. Playwright + `@axe-core/playwright` (E2E) — 6 specs.
- **Deploy target:** Self-hosted on Red's Mac mini M4 Pro via Docker Compose + Cloudflare Tunnel (no Caddy, no port-forwarding; CF terminates TLS at the edge). **Not** Vercel, **not** Turso.

## Directory layout

```
content/posts/             ← MDX fixtures (not the canonical source — see Content above)
public/
  covers/                  ← real JPG covers (optional, fallback to SVG generators)
  search-index.json        ← prebuild artifact (gitignored)
  og/                      ← per-post OG card PNGs (gitignored, regenerated each build)
assets/fonts/              ← .ttf files vendored for OG card rendering (Source Serif 4, JetBrains Mono)
scripts/
  build-cover-manifest.ts  ← prebuild: scans public/covers/ for JPGs
  capture-guide-screenshots.ts  ← reproducible Playwright screenshots for docs/guide/
  migrate-posts-to-db.ts   ← one-time MDX → posts-table seed; idempotent. Reused by E2E global-setup.
  start.mjs                ← container entrypoint: programmatic Drizzle migrate → Next.js standalone server
  backup-blog-db.sh        ← daily sqlite backup (host-side, called by launchd)
  launchd/                 ← macOS launchd plist for the backup
  migrate-data.ts          ← one-time data.jsx → MDX (already run; archived for history)
src/
  app/                     ← App Router
    @drawer/(.)posts/[slug]/page.tsx   ← intercepted drawer route
    posts/[slug]/page.tsx              ← full-page article
    api/health/route.ts                ← Docker / CF health probe
    sitemap.ts, robots.ts              ← Next 15 metadata routes
    feed.xml/route.ts                  ← Atom feed
  components/              ← React components, RSC by default
  covers/                  ← per-cover SVG generators (one file each) + manifest.ts (auto-generated)
  lib/                     ← pure logic + utilities (env, posts, feed, posts-admin, ...)
e2e/                       ← Playwright specs + helpers + global-setup
drizzle/                   ← generated migrations (committed)
docs/
  guide/                   ← reader.md + author.md walkthroughs with screenshots
  superpowers/
    specs/                 ← per-phase design specs
    plans/                 ← per-phase implementation plans
Dockerfile                 ← multi-stage standalone image
docker-compose.yml         ← web + cloudflared services
.env.production.example    ← production env template (real .env.production is gitignored)
.github/workflows/ci.yml   ← typecheck + lint + Vitest on push and PR
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
- `pnpm build` — runs `db:migrate` → `prebuild` → `next build`. **Note:** the production Dockerfile bypasses `pnpm build` and runs the prebuild scripts + `next build` individually (no `db:migrate` at image build — migrations run on container start via `scripts/start.mjs`)
- `pnpm typecheck` — `tsc --noEmit` (treat failures as blocking)
- `pnpm lint` — `next lint`
- `pnpm test` — Vitest run (123 tests)
- `pnpm e2e` — Playwright + axe-core (6 specs; runs `pnpm build` first)
- `pnpm validate` — typecheck + lint + test (the pre-commit gate)
- `pnpm migrate:posts` — one-shot/idempotent: seed/refresh the `posts` table from `content/posts/*.mdx` (used by E2E global-setup; also the recovery path)
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
- **Phase 4a** (CLI, OG/SEO/RSS, JPG covers, Lighthouse, a11y, E2E, docs): merged, `b111155`
- **Phase 4b** (self-host: Docker, compose, Cloudflare Tunnel, backups, OAuth callbacks, CI): merged, `2e3bfb5`
- **Posts → DB migration** (live admin CRUD, runtime search index + OG cards, engagement FKs): merged, see `git log --grep "posts → DB"` for the 8-phase commit history starting at `2fddda5`.

Specs and plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Documentation map

- [`README.md`](./README.md) — quick start, scripts table, env vars
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — frontmatter schema reference
- [`docs/guide/`](./docs/guide/) — visual walkthroughs (reader's + author's, with screenshots)
- [`MIGRATION.md`](./MIGRATION.md) — deviations from the prototype + Lighthouse baseline
- [`DEPLOY.md`](./DEPLOY.md) — self-host walkthrough (CF Tunnel, compose, backups, rollback)
