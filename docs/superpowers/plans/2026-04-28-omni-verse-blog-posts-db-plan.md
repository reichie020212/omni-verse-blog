# Omni-Verse Blog — Posts → DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Memory note: Red prefers **inline execution** on this project — do NOT dispatch subagents unless explicitly asked (`feedback_inline_over_subagents.md`).

**Goal:** Move posts from MDX-on-disk into the libsql DB; ship an admin UI for live CRUD; replace build-time search/OG pipelines with runtime equivalents.

**Spec:** `docs/superpowers/specs/2026-04-28-omni-verse-blog-posts-db-design.md`

**Notes for the implementer:**
- Project conventions live in `CLAUDE.md` and `GEMINI.md` at repo root — read both before starting.
- Commits sign with `-s -S` and use conventional-commits prefixes. No self-attribution.
- **Pure-impl + server-action split is mandatory.** `<name>.ts` (no `'use server'`, no `auth()`) + `<name>-actions.ts` thin wrappers. See `src/lib/bookmarks.ts` + `bookmarks-actions.ts`.
- Don't mask command failures with `| tail`. Run validation commands on their own lines.
- After each phase: `pnpm validate` (typecheck + lint + Vitest). Phase 7+ also needs `pnpm e2e` before commit.
- Each phase = one commit with the suggested prefix below. If a phase grows large, split into well-scoped sub-commits.

---

## Phase 1: Schema additions (zero behavior change)

**Goal:** Add `posts` table and `users.role` column. Generate Drizzle migration. No reads, no writes, no callsite changes.

**Files:**
- Modify: `src/lib/schema.ts`
- Create: `drizzle/<next>_posts_and_role.sql` (via `pnpm db:generate`)

**Steps:**
- [ ] **Add `role` column to `users` table** in `src/lib/schema.ts`:
  - `role: text("role", { enum: ["admin", "user"] }).notNull().default("user")`.
- [ ] **Add `posts` table** matching the spec (§3). Include all fields, default values, and indexes (`posts_draft_idx`, `posts_published_at_idx`, `posts_category_idx`).
- [ ] **Add relations** for `posts` (author → users, plus inverse from users.posts) — engagement-table FKs land in Phase 6, so don't add post-side relations to likes/bookmarks/comments yet.
- [ ] **Generate migration:** `pnpm db:generate`. Inspect the generated SQL — it should `CREATE TABLE posts`, `CREATE INDEX` × 3, and `ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`.
- [ ] **Apply locally:** `pnpm db:migrate`. Verify with `sqlite3 local.db '.schema posts'`.
- [ ] **Validate:** `pnpm typecheck && pnpm lint && pnpm test`.
- [ ] **Commit:** `feat(db): add posts table + users.role for admin gating`.

---

## Phase 2: DB-backed read impls behind a feature flag

**Goal:** Implement DB-read functions matching the existing `src/lib/posts.ts` API, but keep filesystem reads as the default. Wire a feature flag (`POSTS_SOURCE=fs|db`, default `fs`) so the new path is opt-in. No callsite changes.

**Files:**
- Modify: `src/lib/posts.ts`
- Create: `src/lib/posts.test.ts` (or extend existing)
- Modify: `src/lib/env.ts` (add `POSTS_SOURCE`)

**Steps:**
- [ ] **Add `POSTS_SOURCE` env var** (`fs` | `db`) to `src/lib/env.ts`, default `fs`. Zod-validated.
- [ ] **Refactor `src/lib/posts.ts`:** rename existing fs-based functions to `getAllPostsFs()` / `getPostBySlugFs(slug)`. Add new `getAllPostsImpl(db)` / `getPostBySlugImpl(db, slug)` querying the `posts` table. The `Post` shape is unchanged.
  - Filter drafts in DB versions (`where(eq(posts.draft, false))`) for public callsites; expose a separate `getAllPostsIncludingDrafts` for the admin UI later.
- [ ] **Add a dispatcher:** `getAllPosts()` and `getPostBySlug(slug)` (the existing public API) read `POSTS_SOURCE` and dispatch to the fs or DB version. Pass `db` from a singleton import.
- [ ] **Unit tests:** add Vitest cases using `makeTestDb()` for `getAllPostsImpl` (insert 3 rows, assert ordering / draft filter) and `getPostBySlugImpl` (hit + miss).
- [ ] **Validate:** `pnpm validate`. With `POSTS_SOURCE` unset, all existing 123 tests should still pass.
- [ ] **Commit:** `feat(posts): DB-backed read impls behind POSTS_SOURCE flag`.

---

## Phase 3: One-time MDX → DB migration

**Goal:** Ship `scripts/migrate-posts-to-db.ts`. Run it locally with `POSTS_SOURCE=db pnpm dev`, smoke-test the homepage. Don't archive MDX files yet.

**Files:**
- Create: `scripts/migrate-posts-to-db.ts`
- Create: `scripts/migrate-posts-to-db.test.ts` (or fold round-trip into `posts.test.ts`)
- Maybe modify: `scripts/bootstrap-admin.ts` (if it exists) to also flip `users.role` for the bootstrap account
- Possibly create: `scripts/promote-admin.ts <email>` (small helper)

**Steps:**
- [ ] **Write the migration script:** read all MDX from `content/posts/`, parse via the existing logic in `src/lib/posts.ts` (don't introduce `gray-matter` — reuse). For each post:
  - Resolve `authorId` from `ADMIN_EMAIL` env (fail loudly if no matching user row).
  - `INSERT OR REPLACE` into `posts` keyed on `slug`.
- [ ] **Idempotency check:** running the script twice should produce identical row counts and unchanged `updatedAt` only if the source MDX content didn't change. Hash the source body and skip re-writes when unchanged.
- [ ] **Promote admin:** ensure the migrating user's `users.role = 'admin'`. Either inline in the script or via `scripts/promote-admin.ts`.
- [ ] **Round-trip test:** Vitest case that picks one MDX, runs the parser + insert, fetches via `getPostBySlugImpl`, deep-equals the parsed object.
- [ ] **Manual smoke:** `pnpm db:migrate && pnpm tsx scripts/migrate-posts-to-db.ts`, then `POSTS_SOURCE=db pnpm dev` and click through homepage / a couple of posts / a category page / a tag page. Compare to fs version side-by-side.
- [ ] **Validate:** `pnpm validate`.
- [ ] **Commit:** `feat(scripts): one-time MDX → DB migration script + admin role bootstrap`.

---

## Phase 4: Switch reads to DB by default; remove fs path

**Goal:** Flip `POSTS_SOURCE` default to `db`. Delete the fs-reading functions and any callsites still expecting filesystem behavior. **Don't** delete `content/posts/` yet — Phase 8 archives it.

**Files:**
- Modify: `src/lib/posts.ts` (delete `getAllPostsFs`, `getPostBySlugFs`, dispatcher)
- Modify: `src/lib/env.ts` (drop `POSTS_SOURCE`)
- Modify: any RSC under `src/app/` that imported fs-only helpers
- Modify: any test fixture loading from `content/posts/` directly

**Steps:**
- [ ] **Audit callsites:** `rg "content/posts" src/` and `rg "from.*posts['\"]" src/`. Catalog every read; confirm each goes through `getAllPosts` / `getPostBySlug`.
- [ ] **Delete fs path:** remove `getAllPostsFs`, `getPostBySlugFs`, the dispatcher, and `POSTS_SOURCE` from env. `getAllPostsImpl` / `getPostBySlugImpl` are now the only path.
- [ ] **Re-export under the public name:** keep `getAllPosts` / `getPostBySlug` as the public API, now thin wrappers over the impls (no `'use server'`).
- [ ] **Fix tests** that referenced fs paths or fs-only helpers. Use `makeTestDb()` + a small fixture seeder.
- [ ] **Manual smoke:** full nav of the running app — home, drawer, full post page, search, RSS feed, sitemap, OG card route (still build-time at this point). Spot-check covers (deterministic SVG seeded by slug — must look identical to before).
- [ ] **Validate:** `pnpm validate`.
- [ ] **Commit:** `feat(posts): switch reads to DB; remove filesystem path`.

---

## Phase 5: Runtime search index + runtime OG cards

**Goal:** Replace `scripts/build-search-index.ts` with a runtime regenerator triggered after admin mutations (no admin UI yet — write the regenerator and wire a one-shot call after the migration). Replace `scripts/build-og-cards.ts` with `src/app/posts/[slug]/og/route.ts`.

**Files:**
- Create: `src/lib/search-index.ts` (with `regenerateSearchIndex(db)` impl)
- Create: `src/app/posts/[slug]/og/route.ts`
- Create: `src/app/api/search-index.json/route.ts` (serves the JSON from the bind-mounted data dir, per spec §4)
- Modify: `src/components/Search*.tsx` (or wherever the fetch URL for the index lives) — point at `/api/search-index.json` instead of `/search-index.json`
- Modify: `src/app/posts/[slug]/page.tsx` — point `og:image` meta at `/posts/[slug]/og`
- Delete: `scripts/build-search-index.ts`, `scripts/build-og-cards.ts`
- Modify: `package.json` `prebuild` script — drop the deleted steps; if anything else still depends on them, fix that first.

**Steps:**
- [ ] **Implement `regenerateSearchIndex`:** reads all non-draft posts, writes `data/search-index.json` (the bind-mounted writable location). Atomic write via `fs.writeFile` to a temp path then rename.
- [ ] **Add `/api/search-index.json` route handler** serving the file with `Cache-Control: public, max-age=300`.
- [ ] **One-shot regen after migration:** add a step at the end of `scripts/migrate-posts-to-db.ts` that calls `regenerateSearchIndex(db)`. So a fresh box gets the JSON without an admin save.
- [ ] **Implement `/posts/[slug]/og` route:** copy the satori template from `scripts/build-og-cards.ts` into the route handler; return `new ImageResponse(...)` with `revalidate = 86400`.
- [ ] **Update meta:** the `og:image` URL becomes `${SITE_URL}/posts/${slug}/og`.
- [ ] **Delete the build scripts** + clean up `package.json` `prebuild`.
- [ ] **Update Dockerfile** if it referenced the old build steps individually (it does — see Phase 4b plan note about `pnpm exec tsx scripts/build-search-index.ts` etc.). Rebuild the image to confirm.
- [ ] **Manual smoke:** dev-server hit `/api/search-index.json` (should return JSON), open `/posts/<slug>/og` directly (should render PNG), search box still finds posts.
- [ ] **Validate:** `pnpm validate`.
- [ ] **Commit:** `feat(content): runtime search index + runtime OG cards`.

---

## Phase 6: Engagement-table FK upgrade

**Goal:** Add `references(() => posts.slug, { onDelete: "cascade" })` to `likes.postSlug`, `bookmarks.postSlug`, `comments.postSlug`. Sweep orphans first.

**Files:**
- Modify: `src/lib/schema.ts`
- Create: `drizzle/<next>_engagement_post_fk.sql`
- Modify: `relations()` block to expose `posts.likes`, `posts.bookmarks`, `posts.comments` and their inverses

**Steps:**
- [ ] **Orphan sweep query:** `DELETE FROM likes WHERE post_slug NOT IN (SELECT slug FROM posts)` (and same for bookmarks/comments). Run as part of the migration's pre-script. Log row counts.
- [ ] **Add `references()` clauses** in `schema.ts` for the three engagement tables.
- [ ] **Generate + apply migration.** Inspect the SQL — Drizzle's strategy for adding FKs to sqlite involves table-rebuild; verify the generated migration is correct.
- [ ] **Update relations():** `posts` now has `.likes`, `.bookmarks`, `.comments`; the engagement tables get a `.post` relation.
- [ ] **Test cascade:** unit test inserts a post, a like, deletes the post, asserts the like is gone.
- [ ] **Validate:** `pnpm validate`.
- [ ] **Commit:** `feat(db): FK from engagement tables to posts.slug; cascade delete`.

---

## Phase 7: Admin UI + write actions

**Goal:** Ship `/admin/posts` (list), `/admin/posts/new` (create), `/admin/posts/[slug]/edit` (edit + delete). Raw `<textarea>` editor with RSC preview pane. All writes route through impl + actions split. After every mutation: regenerate search index + `revalidatePath`.

**Files:**
- Create: `src/lib/posts-admin.ts` (`upsertPostImpl`, `deletePostImpl`, validation schema)
- Create: `src/lib/posts-admin-actions.ts` (`'use server'` wrappers)
- Create: `src/app/admin/layout.tsx` (role gate)
- Create: `src/app/admin/posts/page.tsx` (list)
- Create: `src/app/admin/posts/new/page.tsx`
- Create: `src/app/admin/posts/[slug]/edit/page.tsx`
- Create: `src/components/AdminPostForm.tsx` (client island — textarea + form state)
- Create: `src/components/AdminPostPreview.tsx` (RSC — renders submitted MDX with the same pipeline as the public page)
- Modify: `src/lib/auth.ts` — extend the session callback to project `role` onto `session.user`
- Create: `e2e/admin.spec.ts`
- Create: `src/lib/posts-admin.test.ts`

**Steps:**
- [ ] **Extend the session callback** in `src/lib/auth.ts` so `session.user.role` is populated on every request. Verify type augmentation in `src/types/next-auth.d.ts` (or wherever the project augments).
- [ ] **Layout role gate:** `src/app/admin/layout.tsx` is RSC; calls `auth()`, redirects to `/` if `session?.user?.role !== 'admin'`.
- [ ] **Validation schema:** define the post-write Zod schema in `posts-admin.ts`; reuse the same shape from the migration script (Phase 3) so they don't drift.
- [ ] **Impl functions:** `upsertPostImpl(db, userId, input)` validates → writes → returns the row. `deletePostImpl(db, slug)` deletes + cascades. No `auth()`, no `'use server'`.
- [ ] **Action wrappers:** `posts-admin-actions.ts` calls `auth()`, asserts admin role, delegates to impl, then runs `regenerateSearchIndex(db)` and `revalidatePath` for `/`, `/posts`, `/posts/<slug>`, and the affected category/tag pages.
- [ ] **List page:** `/admin/posts` shows a table with title, status badge (`draft`/`published`), category, updated date, and edit/delete buttons. Link to `/admin/posts/new`.
- [ ] **New / edit pages:** form with fields for everything in the schema. Cover dropdown enumerates SVG generator names from `src/covers/manifest.ts` + JPG paths. Tags as comma-separated input. Body in a `<textarea>` (rows=20). RSC preview pane below the form, hydrated via the form state on the client island.
- [ ] **Delete:** confirmation modal in the edit page; calls `deletePostAction`, redirects to list on success.
- [ ] **Unit tests:** create / update / delete / draft filtering / role gating (call action with non-admin, assert error).
- [ ] **E2E (`e2e/admin.spec.ts`):** seeded admin login → create draft "E2E Test Post" → publish → assert visible on `/` → edit title → assert update → delete → assert 404.
- [ ] **Validate:** `pnpm validate && pnpm e2e`.
- [ ] **Commit:** `feat(admin): /admin/posts CRUD with raw MDX editor + RSC preview`.

---

## Phase 8: Archive MDX, prune dead code, doc updates

**Goal:** Move `content/posts/*.mdx` to `content/posts/_archive/`, gitignore the archive, remove any code that referenced `content/posts/` directly, refresh the docs.

**Files:**
- Move: `content/posts/*.mdx` → `content/posts/_archive/`
- Modify: `.gitignore` (add `content/posts/_archive/`)
- Modify: `README.md`, `CONTRIBUTING.md`, `docs/guide/author.md` — describe the new admin flow
- Maybe delete: `scripts/new-post.ts` if it's now obsolete (replaced by the admin UI)
- Modify: `CLAUDE.md` — update the "Today's content model" bullet to reflect DB-backed posts

**Steps:**
- [ ] **Move MDX files** to `_archive/`. Don't `git rm`; let the move show as rename + path change.
- [ ] **Add `_archive/` to `.gitignore`** so future archive contents don't appear in diffs.
- [ ] **Delete `scripts/new-post.ts`** if confirmed obsolete (the CLI scaffolder for MDX files). Check `package.json` for the `new-post` script alias and remove it.
- [ ] **Doc updates:**
  - `README.md` — replace the "create a post by adding an MDX file" line with "create a post in the `/admin/posts` UI." Drop the `pnpm new-post` line.
  - `CONTRIBUTING.md` — replace the frontmatter schema reference with a pointer to the admin form fields and the Zod schema in `src/lib/posts-admin.ts`.
  - `docs/guide/author.md` — rewrite around the admin UI; capture screenshots via `scripts/capture-guide-screenshots.ts` (or extend it to cover the admin pages).
  - `CLAUDE.md` — change the **Posts** bullet under "Today's content model" to "stored in the `posts` table; raw MDX rendered via `next-mdx-remote/rsc` at request time."
- [ ] **Validate:** `pnpm validate && pnpm e2e`.
- [ ] **Commit:** `chore: archive content/posts/, prune dead code, refresh docs`.

---

## Done criteria

- All 8 phases committed; `main` is deployable.
- Dev: `pnpm dev` lets Red log in, navigate to `/admin/posts`, create / edit / delete a post, and see the public site reflect changes within a single revalidation cycle.
- Production: `docker compose up -d` after pulling the new image runs migrations on boot and serves DB-backed content. The bind-mounted `data/local.db` and the new `data/search-index.json` are present and writable.
- Tests: 123+ unit (new admin tests), 7+ E2E (existing 6 + admin spec), all green.
- The blog **does not require a redeploy to add or change content**.
