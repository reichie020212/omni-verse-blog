# Omni-Verse Blog — Posts → DB Migration Design

**Date:** 2026-04-28
**Author:** Red (with Gemini as architect, Claude as scribe)
**Status:** Approved
**Predecessors:** Phase 4b (`2e3bfb5`) — self-host on Mac mini behind Cloudflare Tunnel
**Successor:** none planned

---

## 1. Goal

Move post content and metadata from on-disk MDX files (`content/posts/*.mdx`) into the production sqlite database, and add a role-gated admin UI so Red can create, edit, and delete posts via the web with **no redeploy**.

This phase touches the content pipeline, not the deployment story. The Phase 4b stack (Docker Compose + Cloudflared + bind-mounted sqlite + nightly `launchd` backup) is unchanged and absorbs the new write traffic without modification.

---

## 2. Scope

### In scope

1. **`posts` table** in the existing libsql DB, slug-keyed, holding everything the public site needs to render a post.
2. **`users.role` column** (`'admin' | 'user'`, default `'user'`) to gate the admin UI.
3. **One-time MDX → DB migration** script (idempotent), then archive of `content/posts/` into `content/posts/_archive/` (gitignored).
4. **Engagement-table FK upgrade** — `likes`, `bookmarks`, `comments` get FK to `posts(slug)` `ON DELETE CASCADE`, plus an orphan-row sweep before the constraint lands.
5. **Search index** — switch from build-time JSON generation to **regenerate-on-save** (still client-side fuse.js, JSON written to `public/search-index.json` after every post mutation).
6. **OG cards** — switch from build-time PNG batch to **runtime route handler** (`src/app/posts/[slug]/og/route.ts` using satori-via-`ImageResponse`).
7. **Admin UI** at `/admin/posts` — list, create, edit, delete with raw-MDX `<textarea>` + RSC preview pane.
8. **Server actions + impl split** for all write paths, matching the existing `bookmarks.ts` / `bookmarks-actions.ts` pattern.
9. **Tests** — unit (`makeTestDb`), migration round-trip, E2E admin spec.

### Out of scope

- **In-app category management** — categories stay hardcoded in `content/categories.ts`. (Locked decision; one author, no value in a `categories` table.)
- **Multi-author UI** — schema gets `authorId notNull` for future-proofing, but every migrated post is auto-assigned to Red's user row. No UI exposes the field.
- **Local image uploads** — v1 ships paste-an-external-URL only (or use the existing `/public/covers/` JPGs). A local upload handler is a follow-on if Red wants it.
- **Rich-text / WYSIWYG editor** — v1 is raw `<textarea>` + live RSC preview. A toolbar (bold/italic/link helpers) is a follow-on.
- **MDX file removal from git history** — archived files stay in `content/posts/_archive/` (gitignored). The pre-archive history remains in git for audit.
- **Server-side full-text search** — Gemini recommended SQLite FTS5; rejected for v1 because today's `fuse.js` is fuzzy/typo-tolerant and FTS5/`LIKE` isn't. We keep client-side fuse and regenerate the static JSON on every save.

### Decisions locked (with what each one rejects)

| # | Decision | Rejected alternative |
|---|---|---|
| 1 | `slug` is the `posts` PK | `id` autoincrement + unique slug — would force backfill on `likes`/`bookmarks`/`comments` |
| 2 | `tags` as JSON text column | `tags` table + `posts_tags` join — overkill for free-text behavior, no v1 use case |
| 3 | `category` as TEXT against the code enum | normalize into a `categories` table — would require in-app management UI |
| 4 | Body stored as raw MDX TEXT in column `body`, rendered via `next-mdx-remote/rsc` at request time | pre-render on save into HTML — duplicates source-of-truth, complicates editing |
| 5 | `draft boolean` + `date` (ISO `YYYY-MM-DD` text) for sort | timestamp `publishedAt` — `date` is the actual field used by every callsite; switching would touch sort, RSS, sitemap, search-index, page meta |
| 6 | `cover` as TEXT pointer (SVG generator name OR JPG path) using existing `manifest.ts` | DB-stored cover blobs — covers are React components, not data |
| 7 | `authorId` FK to `users.id`, `notNull` | omit field — schema churn later, free to add now |
| 8 | Migration script reuses `src/lib/posts.ts` parser | new dep on `gray-matter` — already covered by existing parser |
| 9 | Search: regenerate `public/search-index.json` on every post mutation, keep client-side fuse | server-side `LIKE`/FTS5 query — loses fuzziness, regresses UX |
| 10 | OG cards: runtime `ImageResponse` route handler | regenerate on save — every post mutation costs a satori render write; runtime is simpler and Next caches the response |
| 11 | Cover manifest: kept as-is | regenerate dynamically — covers stay in code, manifest is unaffected by the migration |
| 12 | Validation: shared Zod schema between migration script and server actions | duplicate schemas — drift risk |
| 13 | Editor: raw `<textarea>` + RSC preview pane | WYSIWYG / toolbar — Red writes MDX comfortably, complexity not justified for v1 |
| 14 | Image uploads: external URL paste only | local upload handler — out of scope for v1 |
| 15 | MDX cleanup: archive to `content/posts/_archive/` (gitignored) | delete outright — keep one easy rollback |

---

## 3. Schema

All additions to `src/lib/schema.ts`. Existing tables unchanged except for the new `role` column on `users` and the new FK on `likes`/`bookmarks`/`comments`.

> **Schema-naming correction (2026-04-28, mid-Phase-1):** the original draft used `summary`/`publishedAt`/`readingMinutes`/`coverAlt` based on a stale CLAUDE.md description. The actual `Post` shape in `src/lib/posts.ts` uses `excerpt`/`date`/`readTime` and also carries `id` (hex `0x4f2`-style) and `size` (`hero`/`wide`/`medium`/`small`). The schema below matches the actual shape 1:1 to keep Phase 2's "Post shape unchanged" promise honest and avoid touching ~9 RSC callsites for cosmetic renames.

```ts
// New
export const posts = sqliteTable("posts", {
  slug: text("slug").primaryKey(),
  id: text("id").notNull().unique(),                        // hex '0x4f2'-style display id
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),                             // raw MDX
  category: text("category").notNull(),                     // matches CATEGORIES enum
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  date: text("date").notNull(),                             // 'YYYY-MM-DD' (ISO date string)
  readTime: integer("read_time").notNull(),
  size: text("size", { enum: ["hero", "wide", "medium", "small"] }).notNull(),
  cover: text("cover").notNull(),                           // generator name or JPG path
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  draft: integer("draft", { mode: "boolean" }).notNull().default(false),
  authorId: text("author_id").notNull().references(() => users.id),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => ({
  draftIdx: index("posts_draft_idx").on(t.draft),
  dateIdx: index("posts_date_idx").on(t.date),
  categoryIdx: index("posts_category_idx").on(t.category),
}));

// Modified
export const users = sqliteTable("user", {
  // ... existing Auth.js fields
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
});

// Modified — FK upgrade (Phase 6 of the plan)
export const likes = sqliteTable("likes", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postSlug: text("post_slug").notNull().references(() => posts.slug, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.postSlug] }) }));
// bookmarks: same shape as likes
// comments: post_slug FK ON DELETE CASCADE
```

Relations: extend `relations()` to expose `posts.author`, `posts.likes`, `posts.bookmarks`, `posts.comments`, plus the inverse on each engagement table.

---

## 4. Data flow changes

### Read path (public site)
- **Before:** `src/lib/posts.ts` globs `content/posts/*.mdx`, parses frontmatter with Zod, returns typed `Post[]`.
- **After:** `getAllPostsImpl(db)` / `getPostBySlugImpl(db, slug)` query the `posts` table; same `Post` shape exported (callers don't change). Drafts filtered server-side. `next-mdx-remote/rsc` still renders the body string at request time.

### Write path (admin)
- New: `upsertPostImpl(db, userId, input)` and `deletePostImpl(db, slug)` in `src/lib/posts-admin.ts` (pure, testable).
- New: `'use server'` wrappers in `src/lib/posts-admin-actions.ts` calling `auth()`, role-gating, then delegating.
- After every mutation, the action:
  1. Calls `regenerateSearchIndex()` — reads all posts, writes `public/search-index.json`.
  2. Calls `revalidatePath('/')`, `revalidatePath('/posts/[slug]', 'page')`, `revalidatePath('/posts')`, and per-affected category/tag.
  3. (No OG card write — it's runtime now.)

### Search
- `public/search-index.json` is now an **artifact written by the running app**, not by the build pipeline. The Docker bind mount must include `public/search-index.json` in a writable location, OR the file must live under `data/` and be served via a route handler. **Decision:** serve via route handler `/api/search-index.json` reading from `data/search-index.json` on the host bind mount. Keeps `public/` immutable post-build. Revisit if it adds latency — current usage is one fetch on first search interaction.

### OG cards
- `src/app/posts/[slug]/og/route.ts` returns an `ImageResponse`. Fonts loaded from `assets/fonts/` (already vendored). No filesystem write.
- `<meta property="og:image">` in `src/app/posts/[slug]/page.tsx` now points at `/posts/[slug]/og` instead of `/og/[slug].png`.
- `scripts/build-og-cards.ts` is removed; the existing `assets/fonts/` directory and the satori/resvg-js deps stay.

### Cover manifest
- Unchanged. Posts still reference covers by name; `src/covers/manifest.ts` still scans `public/covers/` at build.

---

## 5. Auth & authorization

- New env: none — admin role is set in the DB. Bootstrap the first admin in `scripts/migrate-posts-to-db.ts` (or via a small `scripts/promote-admin.ts <email>` helper) by setting `users.role = 'admin'` for the user row matching `ADMIN_EMAIL` from existing env.
- `/admin` and `/api/admin/*` routes gated by a layout-level check: `const session = await auth(); if (session?.user?.role !== 'admin') redirect('/')`. Layout must be RSC.
- The `role` column flows into the JWT/DB session via Auth.js's `session` callback — extend the existing callback to project `role` onto `session.user`.

---

## 6. Tests

| Layer | Coverage |
|---|---|
| Unit (Vitest + `makeTestDb`) | `getAllPostsImpl`, `getPostBySlugImpl`, `upsertPostImpl`, `deletePostImpl`, `regenerateSearchIndex` (write-to-tmpfile variant). Draft filtering, category/tag aggregation, slug uniqueness. |
| Migration | Round-trip: parse one MDX → `upsertPostImpl` → `getPostBySlugImpl` → assert deep-equal on parsed frontmatter + body. Run against the full `content/posts/` set as a single integration test. |
| E2E (Playwright) | New `e2e/admin.spec.ts`: login as seeded admin → create draft → publish → verify on home → edit title → verify update → delete → verify 404. |
| Existing | All 123 unit + 6 E2E specs must keep passing. Watch for tests asserting `content/posts/` directly — those move to fixtures. |

---

## 7. Rollback strategy

Each phase in the plan ships as its own commit. Rollback for any phase is a single `git revert <sha>` followed by a Drizzle migration rollback if the phase introduced one (manual — Drizzle Kit doesn't auto-revert; we keep the down-SQL in the spec doc per phase).

The migration archive (`content/posts/_archive/`) is the disaster-recovery artifact: if the DB is lost or corrupted and the latest backup is too stale, re-running `scripts/migrate-posts-to-db.ts` on the archive restores the content.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Search index regen blocks a slow save | Run regen async after the mutation returns; the home page still serves the previous JSON until rewrite completes. |
| Runtime OG generation slow on first request per post | Next.js route handler default cache headers + `revalidate = 86400`. Re-fetched once a day per post; warm after first hit. |
| Migration script run twice double-inserts | `INSERT OR REPLACE` keyed on `slug`. Idempotent. |
| FK upgrade fails on orphan engagement rows | Phase 6 explicitly runs an orphan-deletion sweep before adding the constraint. |
| Auth.js session callback regression breaks login | Phase 1 isolates the `users.role` column add; the session-callback wiring lands in Phase 7 alongside the admin layout, with E2E coverage. |
| `public/search-index.json` writable from a read-only Docker layer | Move the live JSON to the bind-mounted `data/` directory and serve via a route handler. Documented in §4 above. |

---

## 9. Open follow-ups (not blocking v1)

- Local image upload handler (v2).
- WYSIWYG / markdown toolbar (v2).
- In-app category management (only if Red hits the limits of the code enum).
- Server-side FTS5 search (only if `search-index.json` grows past ~500 KB).
