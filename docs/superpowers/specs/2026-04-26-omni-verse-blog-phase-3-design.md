# Omni-Verse Blog — Phase 3 Design

**Status:** Approved (brainstorm), pending implementation plan
**Date:** 2026-04-26
**Author:** Red + Claude
**Builds on:** Phase 1 (`cb06783` on `main`) and Phase 2 (`ea2d439` on `main`)
**Source spec for prior phases:**
- `docs/superpowers/specs/2026-04-26-omni-verse-blog-phase-1-design.md`
- `docs/superpowers/specs/2026-04-26-omni-verse-blog-phase-2-design.md`

## 1. Scope

Phase 3 turns the read-only blog into an interactive one. Three feature areas, all gated on auth + DB:

1. **Authentication** — Auth.js v5, GitHub + Google providers, DB-backed sessions.
2. **Likes** — toggle, one per `(user, post_slug)`, optimistic UI.
3. **Bookmarks** — anonymous via `localStorage`; signed-in via DB. On first signed-in load, anonymous bookmarks merge into the DB and `localStorage` is cleared.
4. **Comments** — flat (no threading), small markdown subset (`**bold**`, `*italic*`, `` `code` ``, `[link](url)`), author-only soft-delete, in-memory rate limit (1 comment per 30s per user).

Out of scope (deferred to Phase 4): comment editing, threading, moderation tools, server-side rate limiting beyond the in-memory window, profile editing, OG/Twitter card generation, sitemap, RSS, Lighthouse target, Playwright tests, `pnpm new-post` CLI.

## 2. New dependencies

```jsonc
"dependencies": {
  "next-auth":              "^5.0.0-beta",
  "@auth/drizzle-adapter":  "^1.0.0",
  "drizzle-orm":            "^0.36.0",
  "@libsql/client":         "^0.14.0"
},
"devDependencies": {
  "drizzle-kit":            "^0.28.0"
}
```

`next-auth@5.x` is Auth.js v5 (renamed; package name kept). Beta is the current stable channel for Next 15.

## 3. File structure

### Created

```
src/
├── app/
│   ├── api/auth/[...nextauth]/route.ts    ← Auth.js handler
│   ├── signin/page.tsx                    ← /signin
│   └── bookmarks/page.tsx                 ← /bookmarks
├── components/
│   ├── AuthSessionProvider.tsx            ← thin wrapper around SessionProvider
│   ├── UserMenu.tsx                       ← topbar avatar dropdown (client)
│   ├── SignInButton.tsx                   ← topbar fallback (client)
│   ├── LikeButton.tsx                     ← article likes (client)
│   ├── BookmarkButton.tsx                 ← per-post (client)
│   ├── CommentList.tsx                    ← server, renders comments
│   ├── CommentForm.tsx                    ← client, server-action submit
│   ├── DeleteCommentButton.tsx            ← client, owner-only soft-delete
│   ├── MarkdownSubset.tsx                 ← server, renders the subset
│   └── BookmarkSyncBootstrap.tsx          ← client, runs on first signed-in load
└── lib/
    ├── auth.ts                            ← NextAuth + auth() helper
    ├── db.ts                              ← drizzle client
    ├── schema.ts                          ← drizzle schema
    ├── markdown.ts                        ← parser
    ├── markdown.test.ts
    ├── likes.ts                           ← server actions
    ├── bookmarks.ts                       ← server actions
    ├── bookmarks.test.ts
    ├── comments.ts                        ← server actions
    ├── comments.test.ts
    ├── ratelimit.ts
    └── ratelimit.test.ts
drizzle/
├── 0000_init.sql                          ← drizzle-kit output
└── meta/
drizzle.config.ts
```

### Modified

| File | Change |
|---|---|
| `src/app/layout.tsx` | Wrap children in `<AuthSessionProvider>`. |
| `src/components/Topbar.tsx` | Becomes async; renders `<UserMenu>` (signed-in) or `<SignInButton>` (anonymous). |
| `src/components/ArticleHeader.tsx` | Add `<LikeButton>` and `<BookmarkButton>` next to `<ShareButton>`. |
| `src/app/posts/[slug]/page.tsx` | Append `<CommentList>` + `<CommentForm>` after `<RelatedPosts>`. |
| `src/app/@drawer/(.)posts/[slug]/page.tsx` | Same. |
| `src/components/Sidebar.tsx` | When user is signed in, sidebar includes a "Bookmarks" link to `/bookmarks`. |
| `package.json` | Add scripts: `db:generate` (`drizzle-kit generate`), `db:migrate` (`drizzle-kit migrate`), `db:studio` (`drizzle-kit studio`), `auth:secret` (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). `build` becomes `pnpm db:migrate && pnpm prebuild && next build`. |
| `.env.example` | New file at repo root listing required env vars. |
| `.gitignore` | Add `local.db`, `local.db-journal`. |

## 4. Drizzle schema

```ts
// src/lib/schema.ts
import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),
});

export const accounts = sqliteTable(
  'account',
  {
    userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) }),
);

export const sessions = sqliteTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

export const verificationTokens = sqliteTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }),
);

export const likes = sqliteTable(
  'likes',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    postSlug: text('post_slug').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.postSlug] }) }),
);

export const bookmarks = sqliteTable(
  'bookmarks',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    postSlug: text('post_slug').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.postSlug] }) }),
);

export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    postSlug: text('post_slug').notNull(),
    body: text('body').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (t) => ({
    bySlug: index('comments_by_slug_idx').on(t.postSlug, t.createdAt),
  }),
);

// Drizzle relational metadata — needed for `db.query.comments.findMany({ with: { user } })`.
import { relations } from 'drizzle-orm';

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));
```

`users.id` defaults to a UUID — Auth.js's adapter writes user rows on first sign-in.

## 5. Environment variables

```
# .env.example (committed)
AUTH_SECRET=                              # `pnpm auth:secret`
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
DATABASE_URL=file:local.db                # production: libsql://<your-db>.turso.io
DATABASE_AUTH_TOKEN=                      # blank locally, required in production
```

`.env` and `.env.local` stay gitignored. The auth callback URLs are:
- GitHub: `http://localhost:3000/api/auth/callback/github` (dev), `https://<vercel-domain>/api/auth/callback/github` (prod).
- Google: same pattern with `/google`.

Both providers need to be configured in their respective consoles with these callback URLs.

## 6. Auth.js wiring

```ts
// src/lib/auth.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [GitHub, Google],
  session: { strategy: 'database' },
  pages: { signIn: '/signin' },
});
```

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

`auth()` is the canonical session resolver across server components and server actions. It returns `{ user: { id, name, email, image } } | null`.

## 7. DB client

```ts
// src/lib/db.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const url = process.env.DATABASE_URL ?? 'file:local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });
export const db = drizzle(client, { schema });
```

Same code, dev and production. The libsql client speaks SQLite locally and the libsql HTTP/WS protocol against Turso when `DATABASE_AUTH_TOKEN` is set.

## 8. Likes

```ts
// src/lib/likes.ts
'use server';

import { auth } from './auth';
import { db } from './db';
import { likes } from './schema';
import { revalidatePath } from 'next/cache';
import { and, count, eq } from 'drizzle-orm';

export type LikeState = { liked: boolean; count: number };

export async function getLikeState(slug: string): Promise<LikeState> {
  const session = await auth();
  const [{ c }] = await db.select({ c: count() }).from(likes).where(eq(likes.postSlug, slug));
  if (!session?.user?.id) return { liked: false, count: Number(c) };
  const mine = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, session.user.id), eq(likes.postSlug, slug)));
  return { liked: mine.length > 0, count: Number(c) };
}

export async function toggleLike(slug: string): Promise<LikeState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('not signed in');
  const userId = session.user.id;
  const existing = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.postSlug, slug)));
  if (existing.length > 0) {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postSlug, slug)));
  } else {
    await db.insert(likes).values({ userId, postSlug: slug });
  }
  const [{ c }] = await db.select({ c: count() }).from(likes).where(eq(likes.postSlug, slug));
  revalidatePath(`/posts/${slug}`);
  return { liked: existing.length === 0, count: Number(c) };
}
```

`<LikeButton>` (client) receives `slug` and the initial `LikeState` from the server-component parent. On click: signed-in users → optimistic flip + `useTransition` → `toggleLike(slug)` → settle. Anonymous users → render a tooltip "Sign in to like" and clicks bounce them to `/signin?next=…`.

## 9. Bookmarks

```ts
// src/lib/bookmarks.ts
'use server';

import { auth } from './auth';
import { db } from './db';
import { bookmarks } from './schema';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

export type BookmarkState = { bookmarked: boolean };

export async function getMyBookmarkedSlugs(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await db
    .select({ postSlug: bookmarks.postSlug })
    .from(bookmarks)
    .where(eq(bookmarks.userId, session.user.id));
  return rows.map((r) => r.postSlug);
}

export async function toggleBookmark(slug: string): Promise<BookmarkState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('not signed in');
  const userId = session.user.id;
  const existing = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postSlug, slug)));
  if (existing.length > 0) {
    await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.postSlug, slug)));
    revalidatePath('/bookmarks');
    return { bookmarked: false };
  }
  await db.insert(bookmarks).values({ userId, postSlug: slug });
  revalidatePath('/bookmarks');
  return { bookmarked: true };
}

export async function mergeBookmarks(localSlugs: string[]): Promise<{ added: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('not signed in');
  if (localSlugs.length === 0) return { added: 0 };
  const userId = session.user.id;
  const rows = localSlugs.map((slug) => ({ userId, postSlug: slug }));
  const result = await db.insert(bookmarks).values(rows).onConflictDoNothing().returning();
  revalidatePath('/bookmarks');
  return { added: result.length };
}
```

`<BookmarkButton slug={…}>` is a client component with two modes determined by `useSession()`:
- **Anonymous:** state in `localStorage.ovb-bookmarks` (JSON array of slugs). Toggle reads + writes. Toast: "Bookmarked" / "Removed bookmark".
- **Signed-in:** calls `toggleBookmark(slug)`. Same toast.

`<BookmarkSyncBootstrap>` mounts in the layout. It runs **at most once per browser session**: a `useRef` flag plus a `sessionStorage.getItem('ovb-bookmark-sync-ran')` guard. On the first render where `useSession()` reports authenticated, both flags are unset, AND `localStorage.ovb-bookmarks` is non-empty, it calls `mergeBookmarks(slugs)`, then `localStorage.removeItem('ovb-bookmarks')`, then `sessionStorage.setItem('ovb-bookmark-sync-ran', '1')`, then shows a toast `Synced ${added} bookmarks`. Subsequent navigations within the same browser session are no-ops.

## 10. Comments

### Markdown subset (`src/lib/markdown.ts`)

A small hand-written parser. Supported:

- `**text**` → `<strong>text</strong>`
- `*text*` → `<em>text</em>`
- `` `text` `` → `<code>text</code>`
- `[text](url)` → `<a href="url" target="_blank" rel="noreferrer">text</a>` (allowed schemes: `http://`, `https://`, `mailto:`; everything else renders as the literal text)
- All other characters HTML-escaped; raw HTML in input becomes `&lt;script&gt;` etc.
- Newlines render as `<br />`.

Returns React nodes (a `ReactNode`). Lives in `src/components/MarkdownSubset.tsx` as the rendering wrapper; the parser is in `src/lib/markdown.ts`.

### Comment server actions (`src/lib/comments.ts`)

```ts
'use server';

import { auth } from './auth';
import { db } from './db';
import { comments } from './schema';
import { revalidatePath } from 'next/cache';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { check as ratelimitCheck } from './ratelimit';

export async function listComments(slug: string) {
  return db.query.comments.findMany({
    where: eq(comments.postSlug, slug),
    orderBy: asc(comments.createdAt),
    with: { user: { columns: { id: true, name: true, image: true } } },
  });
}

export async function addComment(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('not signed in');
  const slug = String(formData.get('slug') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  if (!slug || !body) throw new Error('missing slug or body');
  if (body.length > 4000) throw new Error('comment too long');
  const guard = ratelimitCheck(session.user.id);
  if (!guard.allowed) throw new Error(`slow down — try again in ${Math.ceil(guard.waitMs / 1000)}s`);
  await db.insert(comments).values({ userId: session.user.id, postSlug: slug, body });
  revalidatePath(`/posts/${slug}`);
}

export async function deleteComment(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('not signed in');
  const found = await db.select().from(comments).where(eq(comments.id, id));
  if (found.length === 0) return;
  if (found[0].userId !== session.user.id) throw new Error('not your comment');
  await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, id));
  revalidatePath(`/posts/${found[0].postSlug}`);
}
```

### Rate limit (`src/lib/ratelimit.ts`)

```ts
const lastPost = new Map<string, number>();
const WINDOW_MS = 30_000;

export function check(userId: string): { allowed: true } | { allowed: false; waitMs: number } {
  const now = Date.now();
  const last = lastPost.get(userId);
  if (last && now - last < WINDOW_MS) {
    return { allowed: false, waitMs: WINDOW_MS - (now - last) };
  }
  lastPost.set(userId, now);
  return { allowed: true };
}
```

In-memory only. A serverless cold start drops the map. **This is intentional** — a 30s window is to prevent accidental double-submits and mash-the-button spam, not a real abuse defense. Real moderation lands in Phase 4 if the blog gets enough traffic to need it.

### `<CommentList>` (server)

```tsx
import { auth } from '@/lib/auth';
import { listComments } from '@/lib/comments';
import { fmtRelative } from '@/lib/format';
import { MarkdownSubset } from './MarkdownSubset';
import { DeleteCommentButton } from './DeleteCommentButton';

export async function CommentList({ slug }: { slug: string }) {
  const [session, items] = await Promise.all([auth(), listComments(slug)]);
  if (items.length === 0) return null;
  const me = session?.user?.id;
  return (
    <section className="comments" aria-label="Comments">
      <h2 className="comments-heading">Comments</h2>
      <ul className="comment-list">
        {items.map((c) => (
          <li key={c.id} className="comment">
            <header className="comment-header">
              {!c.deletedAt && c.user.image && (
                <img className="comment-avatar" src={c.user.image} alt="" />
              )}
              <span className="comment-author">{c.deletedAt ? '[deleted]' : c.user.name}</span>
              <time className="comment-date" dateTime={new Date(c.createdAt).toISOString()}>
                {fmtRelative(new Date(c.createdAt).toISOString().slice(0, 10))}
              </time>
              {!c.deletedAt && me === c.userId && <DeleteCommentButton id={c.id} />}
            </header>
            <div className="comment-body">
              {c.deletedAt ? '[deleted]' : <MarkdownSubset source={c.body} />}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

### `<CommentForm>` (client)

`<form action={addComment}>` — Next 15 server-action form binding. If anonymous, render the "Sign in to comment" CTA card instead. After successful submit: form resets via `useRef`-driven imperative reset, toast "Comment posted" via `useToast()`. `revalidatePath` inside the action causes the server-rendered list to refresh.

## 11. `/signin` page

```tsx
import { signIn } from '@/lib/auth';

export default function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main className="signin">
      <div className="signin-card">
        <h1>Sign in to Omni-Verse</h1>
        <form
          action={async () => {
            'use server';
            const { next } = await searchParams;
            await signIn('github', { redirectTo: next ?? '/' });
          }}
        >
          <button type="submit" className="oauth-button github">Continue with GitHub</button>
        </form>
        <form
          action={async () => {
            'use server';
            const { next } = await searchParams;
            await signIn('google', { redirectTo: next ?? '/' });
          }}
        >
          <button type="submit" className="oauth-button google">Continue with Google</button>
        </form>
        <p className="signin-back"><a href="/">← Back home</a></p>
      </div>
    </main>
  );
}
```

The `/signin` page uses a route-segment `layout.tsx` that omits the topbar/sidebar shell, giving it a focused-task feel.

## 12. `/bookmarks` page

```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getMyBookmarkedSlugs } from '@/lib/bookmarks';
import { getAllPosts } from '@/lib/posts';
import { Sidebar } from '@/components/Sidebar';
import { CardGrid } from '@/components/CardGrid';

export default async function BookmarksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/bookmarks');
  const [slugs, all] = await Promise.all([getMyBookmarkedSlugs(), getAllPosts()]);
  const set = new Set(slugs);
  const posts = all.filter((p) => set.has(p.slug));
  return (
    <div className="layout-with-sidebar">
      <Sidebar />
      <section>
        <header className="listing-header">
          <h1>Bookmarks</h1>
          <p>{posts.length} post{posts.length === 1 ? '' : 's'}</p>
        </header>
        {posts.length === 0 ? (
          <p className="empty-state">No bookmarks yet — tap the bookmark icon on any post.</p>
        ) : (
          <CardGrid posts={posts} />
        )}
      </section>
    </div>
  );
}
```

## 13. Topbar changes

```tsx
// src/components/Topbar.tsx (sketch)
import { auth } from '@/lib/auth';
import { UserMenu } from './UserMenu';
import { SignInButton } from './SignInButton';

export async function Topbar() {
  const session = await auth();
  return (
    <header className="topbar" role="banner">
      <Link href="/" className="brand"> … </Link>
      <SearchInput />
      <nav aria-label="Primary" className="topbar-nav">
        <ThemeToggle />
        {session?.user ? <UserMenu user={session.user} /> : <SignInButton />}
      </nav>
    </header>
  );
}
```

Making `<Topbar>` async opts the layout out of static-rendering for routes that include it. Acceptable trade-off; Next.js 15 SSR is fast enough for a personal blog.

## 14. Testing

| Suite | Coverage |
|---|---|
| `markdown.test.ts` | each marker; nesting (`**bold *italic***`); unclosed marker rendered literally; URL allow-list (`javascript:` blocked); HTML escape (`<script>` rendered literally); `mailto:` allowed; plain text; empty input. |
| `bookmarks.test.ts` | `mergeBookmarks` happy path; idempotency (running twice = no extra rows); empty input → no-op; pre-existing DB rows survive. Uses an in-memory libsql DB seeded from `schema.ts`. |
| `comments.test.ts` | `addComment` writes a row; rate-limit blocks a second `addComment` within 30s; `deleteComment` sets `deletedAt` and keeps the row; `deleteComment` of another user's comment throws. |
| `ratelimit.test.ts` | `check()` allows the first call; blocks a second call inside the window; allows after the window passes (using `vi.useFakeTimers`). |

Test DB is created via `createClient({ url: ':memory:' })`, schema applied with `migrate()` in `beforeEach`. Tests mock `auth()` to return a deterministic session.

Playwright stays deferred to Phase 4.

## 15. Error handling

- All server actions throw on auth failure; the form-binding pattern surfaces these as "actionState" errors; client wraps the action and toasts the message.
- DB connection failure → 500. Phase 4 adds a friendlier global error boundary.
- Auth.js callback errors → standard `/signin?error=…` (we don't customize beyond the page).
- Markdown parser only ever returns safe HTML; the test suite verifies injection attempts.
- Anonymous users hitting protected pages (`/bookmarks`) → server-side `redirect('/signin?next=…')`. The `next` param is sanitized: must start with `/`, must not begin with `//`.

## 16. Acceptance criteria

- `pnpm install` is clean.
- `pnpm db:migrate` against a fresh `local.db` produces the full schema.
- `pnpm dev` boots; `/signin` renders both provider buttons.
- Sign in via GitHub or Google → topbar shows avatar dropdown; visiting `/signin` while signed-in redirects to `/`.
- Anonymous `<LikeButton>` shows the like count + tooltip; click bounces to `/signin?next=…`. Signed-in click flips heart and updates count optimistically; refresh confirms server state.
- Anonymous `<BookmarkButton>` toggles `localStorage.ovb-bookmarks`. Signed-in `<BookmarkButton>` toggles DB rows.
- Sign-in event with non-empty localStorage bookmarks merges them to DB and clears localStorage; toast confirms.
- `/bookmarks` lists bookmarked posts for signed-in users; redirects anonymous.
- `<CommentForm>` posts a comment; markdown subset renders correctly; bold/italic/code/link/escape all behave per the test suite.
- A user can soft-delete only their own comments; deletion sets `deletedAt`; UI shows "[deleted]"; row remains in DB.
- A second comment within 30s of the first is rejected with a "slow down" message.
- `pnpm validate` and `pnpm build` are green.

When all of the above hold, Phase 3 is shipped. Phase 4 (CLI, OG cards, sitemap, RSS, Lighthouse target, Playwright, accessibility audit, deployment hardening) remains.
