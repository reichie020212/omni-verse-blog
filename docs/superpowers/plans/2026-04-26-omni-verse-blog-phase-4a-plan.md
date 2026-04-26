# Omni-Verse Blog — Phase 4a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the Phase 3 codebase to "polished, accessible, discoverable, authorable from the CLI" — adding env validation, an authoring CLI, full SEO/social surface, build-time OG cards + JPG cover manifest, Playwright E2E with axe-core, security headers, and project docs.

**Architecture:** Six independently-committable vertical slices in dependency order: Env validation → Authoring CLI → SEO + social surface → Build-time assets → E2E + a11y → Hardening + docs. All work is additive — no schema changes, no new pages, no new business logic.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Vitest, Playwright + `@axe-core/playwright`, `@clack/prompts`, `satori` + `@resvg/resvg-js`, Zod.

**Spec:** `docs/superpowers/specs/2026-04-26-omni-verse-blog-phase-4a-design.md`

**Notes for the implementer:**
- Project conventions live in `CLAUDE.md` and `GEMINI.md` at repo root — read both before starting.
- Commits are signed (`-s -S`) and use conventional-commits prefixes (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- **Do not** mask command failures with `| tail`. Run `pnpm typecheck` on its own line and check exit status.
- Solo-dev project: work directly on `main`, no worktrees needed for this plan unless a subagent dispatch is in play.

---

## Slice 1 — Env validation

### Task 1: Create `src/lib/env.ts` with zod schema (TDD)

**Files:**
- Create: `src/lib/env.ts`
- Test: `src/lib/env.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { envSchema } from './env';

describe('envSchema', () => {
  const valid = {
    AUTH_SECRET: 'a'.repeat(32),
    DATABASE_URL: 'file:local.db',
    SITE_URL: 'http://localhost:3000',
    E2E_TEST: '0',
    NODE_ENV: 'development',
  };

  it('parses a valid env', () => {
    expect(() => envSchema.parse(valid)).not.toThrow();
  });

  it('rejects missing AUTH_SECRET', () => {
    const { AUTH_SECRET: _omit, ...rest } = valid;
    expect(() => envSchema.parse(rest)).toThrow(/AUTH_SECRET/);
  });

  it('rejects AUTH_SECRET shorter than 32 chars', () => {
    expect(() => envSchema.parse({ ...valid, AUTH_SECRET: 'short' })).toThrow(/32/);
  });

  it('rejects SITE_URL that is not a URL', () => {
    expect(() => envSchema.parse({ ...valid, SITE_URL: 'not a url' })).toThrow();
  });

  it('defaults DATABASE_URL when omitted', () => {
    const { DATABASE_URL: _omit, ...rest } = valid;
    const parsed = envSchema.parse(rest);
    expect(parsed.DATABASE_URL).toBe('file:local.db');
  });

  it('defaults SITE_URL when omitted', () => {
    const { SITE_URL: _omit, ...rest } = valid;
    const parsed = envSchema.parse(rest);
    expect(parsed.SITE_URL).toBe('http://localhost:3000');
  });

  it('defaults E2E_TEST to "0" when omitted', () => {
    const { E2E_TEST: _omit, ...rest } = valid;
    const parsed = envSchema.parse(rest);
    expect(parsed.E2E_TEST).toBe('0');
  });

  it('rejects E2E_TEST values outside the enum', () => {
    expect(() => envSchema.parse({ ...valid, E2E_TEST: 'true' })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/env.test.ts`
Expected: FAIL with "Cannot find module './env'"

- [ ] **Step 3: Implement `env.ts`**

Create `src/lib/env.ts`:

```ts
import { z } from 'zod';

export const envSchema = z.object({
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be ≥32 chars; run `pnpm auth:secret`'),
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

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === 'production' && parsed.E2E_TEST === '1') {
  throw new Error('E2E_TEST=1 is not allowed in production');
}

export const env = parsed;
```

- [ ] **Step 4: Set up an `.env.local` for the test runner so vitest can import the module without crashing**

Vitest imports `env.ts` transitively through `auth.ts` and `db.ts` once those are migrated. Each test process needs `AUTH_SECRET` present.

Create or append to `.env.local` (gitignored):

```
AUTH_SECRET=test-secret-test-secret-test-secret-aaaaa
```

Verify: `[ -f .env.local ]` exists and contains the line.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/lib/env.test.ts`
Expected: PASS, 8/8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts
git commit -s -S -m "feat(env): zod-validated env schema with production safety check"
```

---

### Task 2: Migrate `auth.ts` and `db.ts` to use `env`

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Replace `db.ts` body**

Overwrite `src/lib/db.ts`:

```ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from './env';

const url = env.DATABASE_URL;
const authToken = env.DATABASE_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });
export const db = drizzle(client, { schema });
export type DB = typeof db;
```

- [ ] **Step 2: Confirm `auth.ts` doesn't directly read `process.env`**

Run: `grep -n "process.env" src/lib/auth.ts`
Expected: no output (Auth.js v5 reads `AUTH_SECRET` and provider creds from `process.env` internally — we don't need to change `auth.ts` itself).

If grep finds anything, replace those reads with `env.X` after `import { env } from './env';`.

- [ ] **Step 3: Run all unit tests**

Run: `pnpm test`
Expected: all suites green (env.test.ts + the 10 existing).

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts
git commit -s -S -m "refactor(env): db.ts reads from validated env module"
```

---

### Task 3: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Replace `.env.example` content**

Overwrite `.env.example`:

```
# Auth.js — generate with `pnpm auth:secret`
AUTH_SECRET=

# OAuth providers (optional in dev; required for sign-in to work)
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Database — local: file:local.db; self-host: file:/data/local.db (Phase 4b)
DATABASE_URL=file:local.db
# Required for Turso; leave blank for libsql file mode
DATABASE_AUTH_TOKEN=

# Public site URL (used by sitemap, robots, feed, OG tags)
SITE_URL=http://localhost:3000

# Set to "1" to enable the E2E Credentials provider (dev-only; refused in prod)
E2E_TEST=0
```

- [ ] **Step 2: Verify by inspection**

Run: `cat .env.example`
Expected: matches the content above exactly.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -s -S -m "docs(env): document SITE_URL and E2E_TEST in .env.example"
```

---

## Slice 2 — Authoring CLI

### Task 4: Add `@clack/prompts` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dep**

Run: `pnpm add -D @clack/prompts`
Expected: `@clack/prompts` appears under `devDependencies`; lockfile updated.

- [ ] **Step 2: Verify**

Run: `grep -n '@clack/prompts' package.json`
Expected: 1 match under devDependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -s -S -m "chore: add @clack/prompts for CLI authoring tools"
```

---

### Task 5: Pure functions for slug, id, frontmatter (TDD)

**Files:**
- Create: `src/lib/new-post.ts`
- Test: `src/lib/new-post.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/new-post.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  deriveSlug,
  deriveNextId,
  assembleFrontmatter,
  type NewPostInput,
} from './new-post';

describe('deriveSlug', () => {
  it('lowercases and replaces non-alphanumerics with dashes', () => {
    expect(deriveSlug('Hello, World! 2026')).toBe('hello-world-2026');
  });

  it('collapses runs of dashes', () => {
    expect(deriveSlug('foo --- bar')).toBe('foo-bar');
  });

  it('trims leading and trailing dashes', () => {
    expect(deriveSlug('---foo bar---')).toBe('foo-bar');
  });

  it('passes through already-valid slugs', () => {
    expect(deriveSlug('a-week-in-lisbon')).toBe('a-week-in-lisbon');
  });

  it('throws on titles that produce empty slugs', () => {
    expect(() => deriveSlug('!!!')).toThrow(/slug/i);
  });
});

describe('deriveNextId', () => {
  it('returns 0x000 for empty list', () => {
    expect(deriveNextId([])).toBe('0x000');
  });

  it('returns max+1 in lowercase 3-digit hex', () => {
    expect(deriveNextId(['0x000', '0x001', '0x00f'])).toBe('0x010');
  });

  it('throws when the next id overflows 0xfff', () => {
    expect(() => deriveNextId(['0xfff'])).toThrow(/overflow/i);
  });

  it('ignores ids that do not match the pattern', () => {
    expect(deriveNextId(['bogus', '0x005', 'also-bogus'])).toBe('0x006');
  });
});

describe('assembleFrontmatter', () => {
  const input: NewPostInput = {
    id: '0x010',
    slug: 'my-new-post',
    title: 'My New Post',
    excerpt: 'A short summary.',
    category: 'tech',
    tags: ['tag-a', 'tag-b'],
    date: '2026-04-26',
    size: 'medium',
    cover: 'jovian',
  };

  it('produces YAML frontmatter with the expected fields', () => {
    const yaml = assembleFrontmatter(input);
    expect(yaml).toContain('---');
    expect(yaml).toContain('id: 0x010');
    expect(yaml).toContain('slug: my-new-post');
    expect(yaml).toContain('title: My New Post');
    expect(yaml).toContain('category: tech');
    expect(yaml).toContain('tags: [tag-a, tag-b]');
    expect(yaml).toContain('date: 2026-04-26');
    expect(yaml).toContain('readTime: 1');
    expect(yaml).toContain('size: medium');
    expect(yaml).toContain('cover: jovian');
    expect(yaml).toContain('draft: true');
  });

  it('quotes titles containing single quotes correctly', () => {
    const yaml = assembleFrontmatter({ ...input, title: "Don't break" });
    expect(yaml).toMatch(/title: "Don't break"/);
  });

  it('renders empty tag list as []', () => {
    const yaml = assembleFrontmatter({ ...input, tags: [] });
    expect(yaml).toContain('tags: []');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/new-post.test.ts`
Expected: FAIL with "Cannot find module './new-post'"

- [ ] **Step 3: Implement `new-post.ts`**

Create `src/lib/new-post.ts`:

```ts
export type NewPostInput = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  size: 'hero' | 'wide' | 'medium' | 'small';
  cover: string;
};

export function deriveSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) throw new Error(`title "${title}" yields an empty slug`);
  return slug;
}

const ID_RE = /^0x[0-9a-f]{3}$/;

export function deriveNextId(existing: readonly string[]): string {
  const numbers = existing
    .filter((s) => ID_RE.test(s))
    .map((s) => parseInt(s.slice(2), 16));
  const max = numbers.length === 0 ? -1 : Math.max(...numbers);
  const next = max + 1;
  if (next > 0xfff) throw new Error('post id space overflow (>0xfff)');
  return `0x${next.toString(16).padStart(3, '0')}`;
}

function yamlString(value: string): string {
  if (/^[a-zA-Z0-9_./:-]+$/.test(value)) return value;
  if (!value.includes('"')) return `"${value}"`;
  return `'${value.replace(/'/g, "''")}'`;
}

export function assembleFrontmatter(input: NewPostInput): string {
  const tagsLiteral =
    input.tags.length === 0 ? '[]' : `[${input.tags.join(', ')}]`;
  return [
    '---',
    `id: ${input.id}`,
    `slug: ${input.slug}`,
    `title: ${yamlString(input.title)}`,
    `excerpt: ${yamlString(input.excerpt)}`,
    `category: ${input.category}`,
    `tags: ${tagsLiteral}`,
    `date: ${input.date}`,
    `readTime: 1`,
    `size: ${input.size}`,
    `cover: ${input.cover}`,
    `draft: true`,
    '---',
    '',
    'Write your post here.',
    '',
  ].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/new-post.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Verify the assembled frontmatter passes the existing post schema**

Add this test to the END of `src/lib/new-post.test.ts` (before the closing line):

```ts
import matter from 'gray-matter';
import { PostFrontmatterSchema } from './posts';

describe('assembleFrontmatter integration', () => {
  it('produces frontmatter that PostFrontmatterSchema accepts', () => {
    const input: NewPostInput = {
      id: '0x010',
      slug: 'my-new-post',
      title: 'My New Post',
      excerpt: 'A short summary.',
      category: 'tech',
      tags: ['tag-a', 'tag-b'],
      date: '2026-04-26',
      size: 'medium',
      cover: 'jovian',
    };
    const file = assembleFrontmatter(input);
    const { data } = matter(file);
    expect(() => PostFrontmatterSchema.parse(data)).not.toThrow();
  });
});
```

- [ ] **Step 6: Run test again**

Run: `pnpm test src/lib/new-post.test.ts`
Expected: PASS, all tests green including the integration check.

- [ ] **Step 7: Commit**

```bash
git add src/lib/new-post.ts src/lib/new-post.test.ts
git commit -s -S -m "feat(new-post): pure helpers for slug, id, and frontmatter assembly"
```

---

### Task 6: Interactive CLI script

**Files:**
- Create: `scripts/new-post.ts`
- Modify: `package.json`

- [ ] **Step 1: Implement the CLI script**

Create `scripts/new-post.ts`:

```ts
import path from 'node:path';
import { writeFile, access } from 'node:fs/promises';
import * as p from '@clack/prompts';
import { CATEGORIES } from '../content/categories';
import {
  deriveSlug,
  deriveNextId,
  assembleFrontmatter,
} from '../src/lib/new-post';
import { loadPostsFromDir } from '../src/lib/posts';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const COVER_KEYS = [
  'jovian', 'rust', 'pancakes', 'config', 'notebook', 'tabs',
  'lisbon', 'book', 'web', 'pluto', 'caldo', 'teach', 'sqlite', 'paint',
];

async function main(): Promise<void> {
  p.intro('New post');

  const title = (await p.text({
    message: 'Title',
    validate: (v) =>
      !v ? 'required' : v.length > 200 ? 'must be ≤200 chars' : undefined,
  })) as string;
  if (p.isCancel(title)) { p.cancel('aborted'); process.exit(0); }

  const proposedSlug = deriveSlug(title);
  const slug = (await p.text({
    message: 'Slug',
    initialValue: proposedSlug,
    validate: (v) => (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) ? undefined : 'must be kebab-case alphanumerics'),
  })) as string;
  if (p.isCancel(slug)) { p.cancel('aborted'); process.exit(0); }

  const target = path.join(POSTS_DIR, `${slug}.mdx`);
  try {
    await access(target);
    p.cancel(`refusing to overwrite ${target}`);
    process.exit(1);
  } catch {
    /* file does not exist — good */
  }

  const excerpt = (await p.text({
    message: 'Excerpt',
    validate: (v) =>
      !v ? 'required' : v.length > 300 ? 'must be ≤300 chars' : undefined,
  })) as string;
  if (p.isCancel(excerpt)) { p.cancel('aborted'); process.exit(0); }

  const category = (await p.select({
    message: 'Category',
    options: CATEGORIES
      .filter((c) => c.id !== 'all')
      .map((c) => ({ value: c.id, label: c.label })),
  })) as string;
  if (p.isCancel(category)) { p.cancel('aborted'); process.exit(0); }

  const tagsRaw = (await p.text({
    message: 'Tags (comma-separated)',
    initialValue: '',
  })) as string;
  if (p.isCancel(tagsRaw)) { p.cancel('aborted'); process.exit(0); }
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  for (const t of tags) {
    if (t.length > 30) {
      p.cancel(`tag "${t}" exceeds 30 chars`);
      process.exit(1);
    }
  }

  const size = (await p.select({
    message: 'Size',
    options: [
      { value: 'medium', label: 'medium (default)' },
      { value: 'small', label: 'small' },
      { value: 'wide', label: 'wide' },
      { value: 'hero', label: 'hero' },
    ],
    initialValue: 'medium',
  })) as 'hero' | 'wide' | 'medium' | 'small';
  if (p.isCancel(size)) { p.cancel('aborted'); process.exit(0); }

  const cover = (await p.select({
    message: 'Cover',
    options: COVER_KEYS.map((k) => ({ value: k, label: k })),
  })) as string;
  if (p.isCancel(cover)) { p.cancel('aborted'); process.exit(0); }

  const existing = await loadPostsFromDir(POSTS_DIR, { includeDrafts: true });
  const id = deriveNextId(existing.map((post) => post.id));
  const date = new Date().toISOString().slice(0, 10);

  const file = assembleFrontmatter({
    id, slug, title, excerpt, category, tags, date, size, cover,
  });

  await writeFile(target, file, 'utf8');
  p.outro(`✓ wrote ${path.relative(process.cwd(), target)}`);
}

main().catch((err) => {
  p.cancel(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

- [ ] **Step 2: Add the `new-post` script**

Edit `package.json`. In the `scripts` block, add `"new-post"` between `"migrate"` and `"db:generate"`:

```json
    "migrate": "tsx scripts/migrate-data.ts",
    "new-post": "tsx scripts/new-post.ts",
    "db:generate": "drizzle-kit generate",
```

- [ ] **Step 3: Smoke-test the CLI**

Run the CLI with all-cancel to verify it loads (interactive — manually press Ctrl+C at first prompt):

```
pnpm new-post
```
Expected: clack intro renders, "Title" prompt appears. Cancel out.

Then run a full creation against a throwaway slug:
```
pnpm new-post
```
Provide: title `_temp_phase4a_smoke`, accept derived slug, excerpt `temp`, category `tech`, tags ``, size `medium`, cover `jovian`.
Expected: `content/posts/_temp_phase4a_smoke.mdx` exists with valid frontmatter.

- [ ] **Step 4: Verify the generated file passes the post loader**

Run: `pnpm test src/lib/posts.test.ts`
Expected: PASS (loader picks up the new post without errors).

- [ ] **Step 5: Clean up the smoke-test post**

The CLI derives `_temp_phase4a_smoke` → `temp-phase4a-smoke` (underscores collapsed to dashes).

Run: `rm content/posts/temp-phase4a-smoke.mdx`

- [ ] **Step 6: Run full validation**

Run: `pnpm typecheck`
Run: `pnpm lint`
Run: `pnpm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add scripts/new-post.ts package.json
git commit -s -S -m "feat(new-post): pnpm new-post interactive scaffolder"
```

---

## Slice 3 — SEO + social surface

### Task 7: Site-wide metadata in `app/layout.tsx`

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update the `metadata` export**

In `src/app/layout.tsx`, replace the existing `metadata` block (lines 33–37) with:

```ts
import { env } from '@/lib/env';

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: {
    default: 'Omni-Verse Blog',
    template: '%s — Omni-Verse Blog',
  },
  description:
    "A blog about tech, programming, celestial bodies, family, and whatever else won't leave my head.",
  openGraph: {
    type: 'website',
    siteName: 'Omni-Verse Blog',
    title: 'Omni-Verse Blog',
    description:
      "A blog about tech, programming, celestial bodies, family, and whatever else won't leave my head.",
    images: ['/og/default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Omni-Verse Blog',
    description:
      "A blog about tech, programming, celestial bodies, family, and whatever else won't leave my head.",
    images: ['/og/default.png'],
  },
};
```

(Add the `import { env } from '@/lib/env';` line near the top with the other imports.)

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Smoke-check the dev server renders the new tags**

Run: `pnpm dev` in one terminal, then in another:
```
curl -s http://localhost:3000/ | grep -E 'og:title|twitter:card'
```
Expected: lines for `og:title` and `twitter:card` appear.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -s -S -m "feat(seo): site-wide openGraph and twitter metadata"
```

---

### Task 8: Per-post metadata

**Files:**
- Modify: `src/app/posts/[slug]/page.tsx`

- [ ] **Step 1: Replace the existing `generateMetadata`**

Replace the `generateMetadata` function in `src/app/posts/[slug]/page.tsx` with:

```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Smoke-check a post page renders the per-post tags**

Run: `pnpm dev`, then:
```
curl -s http://localhost:3000/posts/a-week-in-lisbon-mostly-by-foot | grep -E 'og:title|og:image'
```
Expected: `og:title` mentions the Lisbon title, `og:image` references `/og/a-week-in-lisbon-mostly-by-foot.png`.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/posts/[slug]/page.tsx
git commit -s -S -m "feat(seo): per-post openGraph + twitter metadata"
```

---

### Task 9: Sitemap

**Files:**
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Implement sitemap**

Create `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { getAllPosts } from '@/lib/posts';
import { CATEGORIES } from '@/lib/categories';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const base = env.SITE_URL.replace(/\/$/, '');
  const newest = posts[0]?.date ?? new Date().toISOString().slice(0, 10);

  const home: MetadataRoute.Sitemap[number] = {
    url: `${base}/`,
    lastModified: newest,
    priority: 1.0,
  };

  const search: MetadataRoute.Sitemap[number] = {
    url: `${base}/search`,
    priority: 0.5,
  };

  const categories: MetadataRoute.Sitemap = CATEGORIES.filter((c) => c.id !== 'all').map((c) => ({
    url: `${base}/category/${c.id}`,
    priority: 0.7,
  }));

  const tagSet = new Set<string>();
  for (const post of posts) for (const tag of post.tags) tagSet.add(tag);
  const tags: MetadataRoute.Sitemap = [...tagSet].map((t) => ({
    url: `${base}/tag/${t}`,
    priority: 0.5,
  }));

  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/posts/${post.slug}`,
    lastModified: post.date,
    priority: 0.8,
  }));

  return [home, search, ...categories, ...tags, ...postUrls];
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Smoke-check the sitemap renders**

Run: `pnpm dev`, then:
```
curl -s http://localhost:3000/sitemap.xml | head -30
```
Expected: XML with `<urlset>`, includes the home URL, category URLs, and post URLs.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts
git commit -s -S -m "feat(seo): app/sitemap.ts enumerating posts, categories, tags"
```

---

### Task 10: Robots

**Files:**
- Create: `src/app/robots.ts`

- [ ] **Step 1: Implement robots**

Create `src/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = env.SITE_URL.replace(/\/$/, '');
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${base}/sitemap.xml`,
  };
}
```

- [ ] **Step 2: Smoke-check robots renders**

Run: `pnpm dev`, then:
```
curl -s http://localhost:3000/robots.txt
```
Expected:
```
User-Agent: *
Allow: /

Sitemap: http://localhost:3000/sitemap.xml
```

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/robots.ts
git commit -s -S -m "feat(seo): app/robots.ts allowing all + sitemap link"
```

---

### Task 11: Atom feed builder (TDD)

**Files:**
- Create: `src/lib/feed.ts`
- Test: `src/lib/feed.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/feed.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildAtomFeed } from './feed';
import type { Post } from './posts';

const post = (over: Partial<Post> = {}): Post => ({
  id: '0x001',
  slug: 'hello',
  title: 'Hello',
  excerpt: 'A summary.',
  category: 'tech',
  tags: ['t'],
  date: '2026-04-25',
  readTime: 3,
  size: 'medium',
  cover: 'jovian',
  featured: false,
  draft: false,
  body: 'body',
  ...over,
});

describe('buildAtomFeed', () => {
  it('returns Atom XML with the right root element', () => {
    const xml = buildAtomFeed([post()], 'http://localhost:3000');
    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
  });

  it('includes one <entry> per post', () => {
    const xml = buildAtomFeed([post({ slug: 'a' }), post({ slug: 'b' })], 'http://localhost:3000');
    const entries = xml.match(/<entry>/g) ?? [];
    expect(entries.length).toBe(2);
  });

  it('escapes ampersands and angle brackets in title and summary', () => {
    const xml = buildAtomFeed(
      [post({ title: 'A & B', excerpt: 'x < y' })],
      'http://localhost:3000',
    );
    expect(xml).toContain('A &amp; B');
    expect(xml).toContain('x &lt; y');
  });

  it('uses excerpt as summary, not body', () => {
    const xml = buildAtomFeed(
      [post({ excerpt: 'short summary', body: 'long body here' })],
      'http://localhost:3000',
    );
    expect(xml).toContain('short summary');
    expect(xml).not.toContain('long body here');
  });

  it('includes per-post id and link as full URL', () => {
    const xml = buildAtomFeed([post({ slug: 'hello' })], 'http://localhost:3000');
    expect(xml).toContain('http://localhost:3000/posts/hello');
  });

  it('strips trailing slash from base URL', () => {
    const xml = buildAtomFeed([post({ slug: 'hello' })], 'http://localhost:3000/');
    expect(xml).not.toContain('http://localhost:3000//');
  });

  it('sets feed updated to newest post date when posts exist', () => {
    const xml = buildAtomFeed(
      [post({ slug: 'a', date: '2026-04-26' }), post({ slug: 'b', date: '2026-04-20' })],
      'http://localhost:3000',
    );
    expect(xml).toMatch(/<updated>2026-04-26T00:00:00Z<\/updated>/);
  });

  it('handles empty post list', () => {
    const xml = buildAtomFeed([], 'http://localhost:3000');
    expect(xml).toContain('<feed');
    expect(xml).not.toContain('<entry>');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/feed.test.ts`
Expected: FAIL with "Cannot find module './feed'"

- [ ] **Step 3: Implement `feed.ts`**

Create `src/lib/feed.ts`:

```ts
import type { Post } from './posts';

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildAtomFeed(posts: readonly Post[], siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  const newest = posts[0]?.date ?? new Date().toISOString().slice(0, 10);
  const updated = `${newest}T00:00:00Z`;
  const selfLink = `${base}/feed.xml`;

  const entries = posts
    .map((post) => {
      const url = `${base}/posts/${post.slug}`;
      const date = `${post.date}T00:00:00Z`;
      return `  <entry>
    <id>${url}</id>
    <link href="${url}"/>
    <title>${escape(post.title)}</title>
    <summary>${escape(post.excerpt)}</summary>
    <updated>${date}</updated>
    <published>${date}</published>
    <author><name>Red</name></author>
  </entry>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${base}/</id>
  <title>Omni-Verse Blog</title>
  <link rel="self" href="${selfLink}"/>
  <link href="${base}/"/>
  <updated>${updated}</updated>
  <author><name>Red</name></author>
${entries}
</feed>
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/feed.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/feed.ts src/lib/feed.test.ts
git commit -s -S -m "feat(feed): pure Atom builder with escaping and self-link"
```

---

### Task 12: Atom feed route

**Files:**
- Create: `src/app/feed.xml/route.ts`

- [ ] **Step 1: Implement the route**

Create `src/app/feed.xml/route.ts`:

```ts
import { env } from '@/lib/env';
import { getAllPosts } from '@/lib/posts';
import { buildAtomFeed } from '@/lib/feed';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  const posts = (await getAllPosts()).slice(0, 30);
  const xml = buildAtomFeed(posts, env.SITE_URL);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
```

- [ ] **Step 2: Smoke-check the feed renders**

Run: `pnpm dev`, then:
```
curl -s -i http://localhost:3000/feed.xml | head -20
```
Expected:
- Status 200
- `Content-Type: application/atom+xml; charset=utf-8`
- Body starts with `<?xml version="1.0" encoding="utf-8"?>` and contains `<feed`

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/feed.xml/route.ts
git commit -s -S -m "feat(feed): /feed.xml route emitting Atom for latest 30 posts"
```

---

## Slice 4 — Build-time assets

### Task 13: Cover manifest builder + integration

**Files:**
- Create: `scripts/build-cover-manifest.ts`
- Create: `src/covers/manifest.ts` (auto-generated, will be regenerated by the script — committed as a placeholder so imports resolve)
- Modify: `src/covers/index.tsx`
- Modify: `package.json` (prebuild order)
- Modify: `.gitignore` if needed

- [ ] **Step 1: Write the manifest builder**

Create `scripts/build-cover-manifest.ts`:

```ts
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const COVERS_DIR = path.join(process.cwd(), 'public', 'covers');
const OUTPUT = path.join(process.cwd(), 'src', 'covers', 'manifest.ts');

async function main(): Promise<void> {
  let files: string[] = [];
  try {
    files = await readdir(COVERS_DIR);
  } catch {
    files = [];
  }
  const keys = files
    .filter((f) => f.toLowerCase().endsWith('.jpg'))
    .map((f) => f.slice(0, -4))
    .sort();

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  const body = `// Auto-generated by scripts/build-cover-manifest.ts. Do not edit.
export const JPG_COVERS: ReadonlySet<string> = new Set([
${keys.map((k) => `  ${JSON.stringify(k)},`).join('\n')}
]);
`;
  await writeFile(OUTPUT, body, 'utf8');
  console.log(`wrote ${path.relative(process.cwd(), OUTPUT)} (${keys.length} JPG covers)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Generate the initial manifest**

Run: `pnpm tsx scripts/build-cover-manifest.ts`
Expected: `src/covers/manifest.ts` written. With no JPGs in `public/covers/`, the set is empty.

Verify: `cat src/covers/manifest.ts`
Expected:
```ts
// Auto-generated by scripts/build-cover-manifest.ts. Do not edit.
export const JPG_COVERS: ReadonlySet<string> = new Set([
]);
```

- [ ] **Step 3: Wire `<Cover>` to use the manifest**

Replace `src/covers/index.tsx` content with:

```tsx
import Image from 'next/image';
import { DefaultCover } from './default';
import { JovianCover } from './jovian';
import { RustCover } from './rust';
import { PancakesCover } from './pancakes';
import { ConfigCover } from './config';
import { NotebookCover } from './notebook';
import { TabsCover } from './tabs';
import { LisbonCover } from './lisbon';
import { BookCover } from './book';
import { WebCover } from './web';
import { PlutoCover } from './pluto';
import { CaldoCover } from './caldo';
import { TeachCover } from './teach';
import { SqliteCover } from './sqlite';
import { PaintCover } from './paint';
import { JPG_COVERS } from './manifest';

type Size = 'hero' | 'wide' | 'medium' | 'small';

const SIZE_DIMENSIONS: Record<Size, { width: number; height: number }> = {
  hero:   { width: 1200, height: 675 },
  wide:   { width: 800,  height: 450 },
  medium: { width: 600,  height: 400 },
  small:  { width: 400,  height: 250 },
};

const GENERATORS: Record<string, React.ComponentType<{ seed: string; size: Size }>> = {
  jovian: JovianCover,
  rust: RustCover,
  pancakes: PancakesCover,
  config: ConfigCover,
  notebook: NotebookCover,
  tabs: TabsCover,
  lisbon: LisbonCover,
  book: BookCover,
  web: WebCover,
  pluto: PlutoCover,
  caldo: CaldoCover,
  teach: TeachCover,
  sqlite: SqliteCover,
  paint: PaintCover,
};

export function Cover({
  cover,
  slug,
  size,
}: {
  cover: string;
  slug: string;
  size: Size;
}) {
  if (JPG_COVERS.has(slug)) {
    const dim = SIZE_DIMENSIONS[size];
    return (
      <Image
        src={`/covers/${slug}.jpg`}
        alt=""
        width={dim.width}
        height={dim.height}
        className="cover-image"
        priority={size === 'hero'}
      />
    );
  }
  const Generator = GENERATORS[cover] ?? DefaultCover;
  return <Generator seed={slug} size={size} />;
}
```

- [ ] **Step 4: Update `prebuild` order**

Edit `package.json`. Replace the `prebuild` line:

```json
    "prebuild": "tsx scripts/build-cover-manifest.ts && tsx scripts/build-search-index.ts",
```

(OG cards script will be added in Task 15.)

- [ ] **Step 5: Run typecheck and tests**

Run: `pnpm typecheck`
Expected: 0 errors.

Run: `pnpm test`
Expected: all green.

Run: `pnpm build`
Expected: build completes, the prebuild step regenerates `src/covers/manifest.ts` and the search index.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-cover-manifest.ts src/covers/manifest.ts src/covers/index.tsx package.json
git commit -s -S -m "feat(covers): build-time JPG manifest + Image fallback in <Cover>"
```

---

### Task 14: Vendor fonts for OG cards

**Files:**
- Create: `assets/fonts/SourceSerif4-SemiBold.ttf`
- Create: `assets/fonts/JetBrainsMono-Regular.ttf`
- Modify: `.gitignore` (none needed — fonts are committed)

- [ ] **Step 1: Download Source Serif 4 SemiBold**

Run:
```
mkdir -p assets/fonts
curl -fL -o assets/fonts/SourceSerif4-SemiBold.ttf \
  https://github.com/google/fonts/raw/main/ofl/sourceserif4/SourceSerif4-SemiBold.ttf
```
Expected: file size ~250KB.

- [ ] **Step 2: Download JetBrains Mono Regular**

Run:
```
curl -fL -o assets/fonts/JetBrainsMono-Regular.ttf \
  https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Regular.ttf
```
Expected: file size ~150KB.

- [ ] **Step 3: Verify files**

Run: `ls -la assets/fonts/`
Expected: both `.ttf` files listed, non-zero size.

- [ ] **Step 4: Commit**

```bash
git add assets/fonts/
git commit -s -S -m "chore(fonts): vendor Source Serif 4 + JetBrains Mono for OG card rendering"
```

---

### Task 15: OG card builder

**Files:**
- Create: `scripts/build-og-cards.ts`
- Modify: `package.json` (deps + prebuild order)
- Modify: `.gitignore`

- [ ] **Step 1: Add deps**

Run: `pnpm add -D satori @resvg/resvg-js`
Expected: deps appear in `devDependencies`.

- [ ] **Step 2: Add `public/og/` to .gitignore**

Append to `.gitignore`:
```
public/og/
```
(OG PNGs are build artifacts.)

- [ ] **Step 3: Implement the OG card script**

Create `scripts/build-og-cards.ts`:

```ts
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { loadPostsFromDir } from '../src/lib/posts';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUT_DIR = path.join(ROOT, 'public', 'og');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');

const ACCENT = '#7CFFB2';
const BG = '#0E1116';
const FG = '#E6EDF3';
const FG_MUTED = '#9DA7B3';

type FontSpec = {
  name: string;
  data: Buffer;
  weight: 400 | 600;
  style: 'normal';
};

async function loadFonts(): Promise<FontSpec[]> {
  const [serif, mono] = await Promise.all([
    readFile(path.join(FONTS_DIR, 'SourceSerif4-SemiBold.ttf')),
    readFile(path.join(FONTS_DIR, 'JetBrainsMono-Regular.ttf')),
  ]);
  return [
    { name: 'SourceSerif4', data: serif, weight: 600, style: 'normal' },
    { name: 'JetBrainsMono', data: mono, weight: 400, style: 'normal' },
  ];
}

function card({ title, meta }: { title: string; meta: string }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: BG,
        padding: '64px',
        fontFamily: 'SourceSerif4',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontFamily: 'JetBrainsMono',
              fontSize: '24px',
              color: FG_MUTED,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: ACCENT,
                    color: BG,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  },
                  children: 'Ω',
                },
              },
              { type: 'span', props: { children: '~/omni-verse' } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '72px',
              lineHeight: 1.1,
              color: FG,
              fontWeight: 600,
              maxWidth: '1000px',
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'JetBrainsMono',
              fontSize: '24px',
              color: FG_MUTED,
            },
            children: meta,
          },
        },
      ],
    },
  };
}

async function renderPng(node: ReturnType<typeof card>, fonts: FontSpec[]): Promise<Buffer> {
  const svg = await satori(node, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return Buffer.from(png);
}

async function fileNewerThan(file: string, ref: string): Promise<boolean> {
  try {
    const [a, b] = await Promise.all([stat(file), stat(ref)]);
    return a.mtimeMs > b.mtimeMs;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const fonts = await loadFonts();

  // Default card
  const defaultPath = path.join(OUT_DIR, 'default.png');
  const defaultPng = await renderPng(
    card({ title: 'Omni-Verse Blog', meta: "A blog about whatever won't leave my head" }),
    fonts,
  );
  await writeFile(defaultPath, defaultPng);
  console.log(`wrote ${path.relative(ROOT, defaultPath)}`);

  const posts = await loadPostsFromDir(POSTS_DIR, { includeDrafts: false });
  let written = 0;
  let skipped = 0;
  for (const post of posts) {
    const out = path.join(OUT_DIR, `${post.slug}.png`);
    const src = path.join(POSTS_DIR, `${post.slug}.mdx`);
    if (await fileNewerThan(out, src)) {
      skipped++;
      continue;
    }
    const meta = `${post.date} · ${post.readTime} min read`;
    const png = await renderPng(card({ title: post.title, meta }), fonts);
    await writeFile(out, png);
    written++;
  }
  console.log(`og cards: ${written} written, ${skipped} up-to-date`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Update `prebuild` to include OG cards**

Edit `package.json`. Replace the `prebuild` line:

```json
    "prebuild": "tsx scripts/build-cover-manifest.ts && tsx scripts/build-og-cards.ts && tsx scripts/build-search-index.ts",
```

- [ ] **Step 5: Run the OG card script standalone**

Run: `pnpm tsx scripts/build-og-cards.ts`
Expected: prints "og cards: N written, 0 up-to-date" where N = number of published posts; `public/og/default.png` and `public/og/<slug>.png` files exist.

- [ ] **Step 6: Verify with file inspection**

Run: `ls public/og/ | wc -l && file public/og/default.png`
Expected: count > 1; file type is "PNG image data, 1200 x 630".

- [ ] **Step 7: Run idempotency check**

Run: `pnpm tsx scripts/build-og-cards.ts`
Expected: prints "og cards: 0 written, N up-to-date".

- [ ] **Step 8: Run full build**

Run: `pnpm build`
Expected: build completes, prebuild generates manifest + og cards + search index.

- [ ] **Step 9: Commit**

```bash
git add scripts/build-og-cards.ts package.json pnpm-lock.yaml .gitignore
git commit -s -S -m "feat(og): build-time OG card generation via satori + resvg"
```

---

### Task 16: Reduced-motion CSS audit (TDD)

**Files:**
- Modify: `src/styles/globals.css`
- Test: `src/lib/reduced-motion.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/reduced-motion.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(
  path.join(process.cwd(), 'src', 'styles', 'globals.css'),
  'utf8',
);

function withinReducedMotion(): string[] {
  const blocks: string[] = [];
  const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g;
  let match;
  while ((match = re.exec(CSS)) !== null) {
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    while (i < CSS.length && depth > 0) {
      if (CSS[i] === '{') depth++;
      else if (CSS[i] === '}') depth--;
      i++;
    }
    blocks.push(CSS.slice(start, i - 1));
  }
  return blocks;
}

describe('reduced motion CSS', () => {
  const blocks = withinReducedMotion();
  const all = blocks.join('\n');

  it('exists at all', () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('disables blinking topbar cursor', () => {
    expect(all).toMatch(/\.cursor[\s\S]*?animation:\s*none/);
  });

  it('overrides smooth scroll on html', () => {
    expect(all).toMatch(/html[\s\S]*?scroll-behavior:\s*auto/);
  });

  it('removes hover lifts on cards', () => {
    expect(all).toMatch(/\.post-card:hover[\s\S]*?transform:\s*none/);
  });

  it('keeps the existing drawer-fade override', () => {
    expect(all).toMatch(/\.post-drawer[\s\S]*?transform:\s*none/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/reduced-motion.test.ts`
Expected: FAIL on at least one of: blinking cursor, smooth scroll, hover lifts (drawer rule already exists).

- [ ] **Step 3: Add the missing rules to `globals.css`**

Append to `src/styles/globals.css`:

```css
/* Phase 4a — reduced-motion completeness pass */
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  .cursor {
    animation: none;
  }
  .post-card:hover {
    transform: none;
  }
  .sidebar-link:hover {
    transform: none;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/reduced-motion.test.ts`
Expected: PASS, 5/5 tests.

- [ ] **Step 5: Run full test suite**

Run: `pnpm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/styles/globals.css src/lib/reduced-motion.test.ts
git commit -s -S -m "feat(a11y): reduced-motion completeness — cursor, scroll, hover lifts"
```

---

## Slice 5 — E2E + a11y

### Task 17: Playwright + axe-core deps and config

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/.gitkeep` (placeholder)
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install deps**

Run: `pnpm add -D @playwright/test @axe-core/playwright`
Expected: deps in `devDependencies`.

- [ ] **Step 2: Install Playwright browsers**

Run: `pnpm exec playwright install chromium`
Expected: chromium downloaded to `~/Library/Caches/ms-playwright/`.

- [ ] **Step 3: Create the config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `pnpm build && DATABASE_URL=file:e2e.db E2E_TEST=1 pnpm start`,
    port: PORT,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: 'file:e2e.db',
      E2E_TEST: '1',
      AUTH_SECRET: 'test-secret-test-secret-test-secret-aaaaa',
      SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
```

- [ ] **Step 4: Add the `e2e` script + add `e2e.db` and `playwright-report/` and `test-results/` to .gitignore**

Edit `package.json`. Add `"e2e": "playwright test",` after `"test:watch"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "validate": "pnpm run typecheck && pnpm run lint && pnpm run test",
```

Append to `.gitignore`:
```
e2e.db
e2e.db-*
playwright-report/
test-results/
.playwright/
```

- [ ] **Step 5: Add `e2e/.gitkeep` placeholder**

Create empty file: `e2e/.gitkeep`

- [ ] **Step 6: Verify config typechecks**

Run: `pnpm typecheck`
Expected: 0 errors. (Note: typecheck currently doesn't include `e2e/` — that's handled in Task 18.)

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts e2e/.gitkeep package.json pnpm-lock.yaml .gitignore
git commit -s -S -m "chore(e2e): playwright config + axe-core dep"
```

---

### Task 18: Include `e2e/` in typecheck

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Read existing tsconfig**

Run: `cat tsconfig.json`
Inspect the `include` array.

- [ ] **Step 2: Add `e2e/**/*.ts` to includes**

Edit `tsconfig.json`. The `include` array should look something like:

```json
"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "e2e/**/*.ts"],
```

If `**/*.ts` is already there with no `exclude` for `e2e`, this step is a no-op — verify and skip.

- [ ] **Step 3: Verify typecheck still passes**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit (only if changed)**

```bash
git diff --quiet tsconfig.json || (git add tsconfig.json && git commit -s -S -m "chore(tsconfig): include e2e/ in typecheck")
```

---

### Task 19: E2E Credentials provider (gated)

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Update `auth.ts`**

Replace `src/lib/auth.ts` content:

```ts
import NextAuth, { type NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { user as userTable } from './schema';
import { env } from './env';

const E2E_TEST_EMAIL = 'e2e@test.local';

const baseProviders: NextAuthConfig['providers'] = [GitHub, Google];

if (env.E2E_TEST === '1' && env.NODE_ENV !== 'production') {
  baseProviders.push(
    Credentials({
      name: 'E2E Test',
      credentials: { email: { label: 'Email', type: 'email' } },
      authorize: async (creds) => {
        if (!creds || creds.email !== E2E_TEST_EMAIL) return null;
        const existing = await db.query.user.findFirst({
          where: eq(userTable.email, E2E_TEST_EMAIL),
        });
        if (existing) return existing;
        const [created] = await db
          .insert(userTable)
          .values({
            id: 'e2e-user',
            email: E2E_TEST_EMAIL,
            name: 'E2E User',
            emailVerified: null,
            image: null,
          })
          .returning();
        return created;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: baseProviders,
  session: { strategy: env.E2E_TEST === '1' ? 'jwt' : 'database' },
  pages: { signIn: '/signin' },
});
```

(Note: Auth.js's Credentials provider doesn't work with database sessions. The session strategy switches to JWT only in E2E mode — production stays on database sessions.)

- [ ] **Step 2: Update the signin page to render the E2E form when active**

Edit `src/app/signin/page.tsx`:

1. Add `import { env } from '@/lib/env';` near the top with the other imports.
2. Insert this JSX block immediately after the closing `</form>` of the Google form (line ~39) and before `<p className="signin-back">` (line ~40):

```tsx
{env.E2E_TEST === '1' ? (
  <form
    action={async () => {
      'use server';
      await signIn('credentials', { email: 'e2e@test.local', redirectTo });
    }}
  >
    <button type="submit" className="oauth-button" data-testid="e2e-signin">
      Continue as E2E test user
    </button>
  </form>
) : null}
```

The `data-testid="e2e-signin"` lets specs target this button.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 4: Run unit tests**

Run: `pnpm test`
Expected: all green (existing auth tests, if any, still pass; this change doesn't break the public surface).

- [ ] **Step 5: Smoke-test the gating**

Run: `E2E_TEST=1 pnpm dev` and visit http://localhost:3000/signin — the "Continue as E2E test user" button should be visible. Stop the server.

Run plain: `pnpm dev` — the button should NOT be visible. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/signin/page.tsx
git commit -s -S -m "feat(e2e): gated Credentials provider for Playwright sign-in"
```

---

### Task 20: E2E global setup (DB seed)

**Files:**
- Create: `e2e/global-setup.ts`

- [ ] **Step 1: Implement global setup**

Create `e2e/global-setup.ts`:

```ts
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

export default async function globalSetup(): Promise<void> {
  const dbPath = path.join(process.cwd(), 'e2e.db');
  try {
    rmSync(dbPath);
  } catch {
    /* not present, fine */
  }
  // Apply Drizzle migrations against the fresh e2e.db
  execSync('pnpm db:migrate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:e2e.db' },
  });
}
```

- [ ] **Step 2: Run a tentative `pnpm e2e` to verify config loads (no specs yet)**

Run: `pnpm e2e --list`
Expected: no specs to list (only `.gitkeep` in `e2e/`); webServer not invoked at this stage.

- [ ] **Step 3: Commit**

```bash
git add e2e/global-setup.ts
git commit -s -S -m "feat(e2e): global setup seeds fresh e2e.db with migrations"
```

---

### Task 21: E2E helpers + home spec

**Files:**
- Create: `e2e/helpers.ts`
- Create: `e2e/home.spec.ts`

- [ ] **Step 1: Implement helpers**

Create `e2e/helpers.ts`:

```ts
import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function checkA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (blocking.length > 0) {
    const lines = blocking
      .map((v) => `  - ${v.id} [${v.impact}]: ${v.description}\n    ${v.helpUrl}`)
      .join('\n');
    throw new Error(`a11y violations:\n${lines}`);
  }
}

export async function signInAsE2E(page: Page): Promise<void> {
  await page.goto('/signin');
  await page.getByTestId('e2e-signin').click();
  await expect(page).toHaveURL(/\/$|\/(?!signin)/);
}
```

- [ ] **Step 2: Implement the home spec**

Create `e2e/home.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { checkA11y } from './helpers';

test('home renders hero, grid, and sidebar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  // Sidebar nav
  await expect(page.getByRole('navigation')).toBeVisible();
  // At least one post card visible
  const cards = page.locator('.post-card, .card-grid a');
  await expect(cards.first()).toBeVisible();
  await checkA11y(page);
});
```

- [ ] **Step 3: Run the spec**

Run: `pnpm e2e e2e/home.spec.ts`
Expected: PASS. (First run is slow because `pnpm build` runs in webServer.)

If it fails on a11y, fix the offending markup in the relevant component and re-run.

- [ ] **Step 4: Commit**

```bash
git add e2e/helpers.ts e2e/home.spec.ts
git commit -s -S -m "test(e2e): home renders + a11y clean"
```

---

### Task 22: E2E drawer spec

**Files:**
- Create: `e2e/drawer.spec.ts`

- [ ] **Step 1: Implement the spec**

Create `e2e/drawer.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { checkA11y } from './helpers';

test('clicking a card opens the drawer; Escape closes it', async ({ page }) => {
  await page.goto('/');
  const firstCard = page.locator('a[href^="/posts/"]').first();
  const href = await firstCard.getAttribute('href');
  await firstCard.click();
  await expect(page).toHaveURL(href!);
  const drawer = page.locator('dialog.post-drawer[open]');
  await expect(drawer).toBeVisible();
  await checkA11y(page);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});
```

- [ ] **Step 2: Run the spec**

Run: `pnpm e2e e2e/drawer.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/drawer.spec.ts
git commit -s -S -m "test(e2e): drawer opens on click and closes on Escape"
```

---

### Task 23: E2E category filter spec

**Files:**
- Create: `e2e/category-filter.spec.ts`

- [ ] **Step 1: Implement the spec**

Create `e2e/category-filter.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('category click filters the grid', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Tech' }).first().click();
  await expect(page).toHaveURL(/\/category\/tech$/);
  // At least one card visible after filter
  const cards = page.locator('a[href^="/posts/"]');
  await expect(cards.first()).toBeVisible();
});
```

- [ ] **Step 2: Run the spec**

Run: `pnpm e2e e2e/category-filter.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/category-filter.spec.ts
git commit -s -S -m "test(e2e): category sidebar filters grid"
```

---

### Task 24: E2E search spec

**Files:**
- Create: `e2e/search.spec.ts`

- [ ] **Step 1: Implement the spec**

Create `e2e/search.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { checkA11y } from './helpers';

test('topbar search → live filter → Enter navigates to /search', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox');
  await search.fill('lisbon');
  // live filter still on home page
  await expect(page).toHaveURL('/');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=lisbon$/);
  // at least one result
  await expect(page.locator('a[href^="/posts/"]').first()).toBeVisible();
  await checkA11y(page);
});
```

- [ ] **Step 2: Run the spec**

Run: `pnpm e2e e2e/search.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/search.spec.ts
git commit -s -S -m "test(e2e): topbar search live-filter + Enter navigates"
```

---

### Task 25: E2E bookmark spec

**Files:**
- Create: `e2e/bookmark.spec.ts`

- [ ] **Step 1: Implement the spec**

Create `e2e/bookmark.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { signInAsE2E } from './helpers';

test('anon bookmark → sign in → merges into DB → /bookmarks lists it', async ({ page }) => {
  // Anon flow: bookmark a post via UI
  await page.goto('/');
  const firstPostLink = page.locator('a[href^="/posts/"]').first();
  const slug = (await firstPostLink.getAttribute('href'))!.replace('/posts/', '');
  await firstPostLink.click();
  await page.getByRole('button', { name: /bookmark/i }).click();

  // Sign in
  await signInAsE2E(page);

  // Bookmark should be present on /bookmarks after merge
  await page.goto('/bookmarks');
  await expect(page.getByText(slug, { exact: false }).first()).toBeVisible({ timeout: 5_000 });
});
```

- [ ] **Step 2: Run the spec**

Run: `pnpm e2e e2e/bookmark.spec.ts`
Expected: PASS.

If the test fails because the slug doesn't appear by text alone, replace the assertion with a stronger selector — e.g. `page.locator('a[href$="/posts/<slug>"]')` resolved against the captured slug.

- [ ] **Step 3: Commit**

```bash
git add e2e/bookmark.spec.ts
git commit -s -S -m "test(e2e): anon bookmark merges to DB on sign-in"
```

---

### Task 26: E2E comment spec

**Files:**
- Create: `e2e/comment.spec.ts`

- [ ] **Step 1: Implement the spec**

Create `e2e/comment.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { signInAsE2E } from './helpers';

test('signed-in user adds a comment, sees it, deletes it', async ({ page }) => {
  await signInAsE2E(page);

  // Visit a known post
  await page.goto('/posts/a-week-in-lisbon-mostly-by-foot');

  const body = `e2e-comment-${Date.now()}`;
  const textarea = page.getByRole('textbox', { name: /comment/i });
  await textarea.fill(body);
  await page.getByRole('button', { name: /post comment/i }).click();

  // Comment visible
  const comment = page.getByText(body);
  await expect(comment).toBeVisible({ timeout: 5_000 });

  // Delete the comment
  await page.getByRole('button', { name: /delete/i }).first().click();
  await expect(comment).toBeHidden({ timeout: 5_000 });
});
```

- [ ] **Step 2: Run the spec**

Run: `pnpm e2e e2e/comment.spec.ts`
Expected: PASS.

If the textarea or button names don't match (the spec assumes `getByRole('textbox', { name: /comment/i })` matches the form's labelled textarea), adjust selectors to match the actual `CommentForm` component output. Read `src/components/CommentForm.tsx` for the exact label/aria attributes and pivot.

- [ ] **Step 3: Run the full E2E suite**

Run: `pnpm e2e`
Expected: 6/6 specs pass.

- [ ] **Step 4: Commit**

```bash
git add e2e/comment.spec.ts
git commit -s -S -m "test(e2e): signed-in user comment add + delete"
```

---

## Slice 6 — Hardening + docs

### Task 27: Security headers + standalone output

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Replace `next.config.ts`**

Overwrite `next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  output: 'standalone',
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    return [
      {
        source: '/:path*',
        headers: [
          ...(isProd
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Run typecheck and build**

Run: `pnpm typecheck`
Expected: 0 errors.

Run: `pnpm build`
Expected: build completes. The `.next/standalone/` directory now exists.

- [ ] **Step 3: Smoke-check headers**

Run: `pnpm start` in one terminal, then in another:
```
curl -sI http://localhost:3000/ | grep -E 'X-Frame|X-Content|Referrer|Permissions'
```
Expected: all four headers present.

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -s -S -m "feat(security): security headers + output: 'standalone' for self-host"
```

---

### Task 28: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:

````markdown
# Omni-Verse Blog

Red's personal blog. A blog about tech, programming, celestial bodies, family, and whatever else won't leave my head.

## Quick start

```bash
git clone <repo> && cd omni-verse-blog
pnpm install
cp .env.example .env.local
pnpm auth:secret  # paste output into AUTH_SECRET in .env.local
pnpm db:migrate
pnpm dev
```

OAuth providers are optional in dev. To enable sign-in locally, register a GitHub OAuth app at <https://github.com/settings/developers> with callback `http://localhost:3000/api/auth/callback/github`, and a Google OAuth client at <https://console.cloud.google.com/apis/credentials> with callback `http://localhost:3000/api/auth/callback/google`. Paste the client IDs/secrets into `.env.local`.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server with HMR |
| `pnpm build` | Production build (runs `db:migrate` → `prebuild` → `next build`) |
| `pnpm start` | Run the production build |
| `pnpm new-post` | Interactive post scaffolder (see CONTRIBUTING.md) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `next lint` |
| `pnpm test` | Vitest unit suite |
| `pnpm e2e` | Playwright E2E suite (slow; runs `pnpm build` first) |
| `pnpm validate` | `typecheck` + `lint` + `test` (the pre-commit gate) |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:studio` | Drizzle Studio in the browser |
| `pnpm auth:secret` | Generate a 32-byte AUTH_SECRET |
| `pnpm format` | Prettier write |

## Environment variables

All env vars are validated by `src/lib/env.ts` at boot.

| Var | Required | Default | Purpose |
|---|---|---|---|
| `AUTH_SECRET` | yes | — | Auth.js session signing key (≥32 chars) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | no | — | GitHub OAuth |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | no | — | Google OAuth |
| `DATABASE_URL` | no | `file:local.db` | libsql/Turso connection |
| `DATABASE_AUTH_TOKEN` | no | — | Required for Turso, blank for local |
| `SITE_URL` | no | `http://localhost:3000` | Public origin (sitemap, OG, feed) |
| `E2E_TEST` | no | `0` | `1` enables the test Credentials provider (refused in production) |

## Authoring

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full content workflow.

## Project structure

See `CLAUDE.md` (or `GEMINI.md`) for the full layout, conventions, and gotchas — written for AI assistants but useful for humans too.

## Tests

- `pnpm test` — Vitest, fast, run before every commit.
- `pnpm e2e` — Playwright + axe-core, slow, run before pushing significant changes.

E2E tests use a separate `e2e.db` (gitignored) and a gated test-only Credentials provider — real OAuth never runs in CI.

## Phase status

- Phase 1 — static MVP — complete
- Phase 2 — drawer, progress, related, sort, search — complete
- Phase 3 — auth, DB, likes, bookmarks, comments — complete
- Phase 4a — quality, SEO, OG cards, E2E, docs — complete
- Phase 4b — self-host on Mac mini (Docker, Caddy, backups) — pending

Specs and plans live in `docs/superpowers/`.

## License

MIT
````

- [ ] **Step 2: Verify**

Run: `head -20 README.md && wc -l README.md`
Expected: header renders cleanly, ~80 lines.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -s -S -m "docs: README with quick start, scripts, env vars"
```

---

### Task 29: CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write the CONTRIBUTING doc**

Create `CONTRIBUTING.md`:

````markdown
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
````

- [ ] **Step 2: Verify**

Run: `wc -l CONTRIBUTING.md`
Expected: 60–80 lines.

- [ ] **Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -s -S -m "docs: CONTRIBUTING with authoring workflow + frontmatter schema"
```

---

### Task 30: Lighthouse measurement

**Files:**
- (Adds entries to `MIGRATION.md` in Task 31; this task just produces numbers)

- [ ] **Step 1: Install lighthouse globally for the session if not present**

Run: `pnpm dlx -p lighthouse lighthouse --version`
Expected: prints a version (downloads on first run).

- [ ] **Step 2: Build and serve**

Run: `pnpm build`
Run: `pnpm start &` (note the PID)
Wait 2 seconds for the server to come up.

- [ ] **Step 3: Measure home and one post**

Run:
```
pnpm dlx lighthouse http://localhost:3000/ \
  --output=json --output-path=./.lighthouse-home.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless" --quiet
pnpm dlx lighthouse http://localhost:3000/posts/a-week-in-lisbon-mostly-by-foot \
  --output=json --output-path=./.lighthouse-post.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless" --quiet
```
Expected: two JSON files written.

- [ ] **Step 4: Extract scores**

Run:
```
node -e 'const j=require("./.lighthouse-home.json");for(const k of ["performance","accessibility","best-practices","seo"])console.log(k,Math.round(j.categories[k].score*100))'
node -e 'const j=require("./.lighthouse-post.json");for(const k of ["performance","accessibility","best-practices","seo"])console.log(k,Math.round(j.categories[k].score*100))'
```
Expected: four scores per URL. Record them — Task 31 puts them in MIGRATION.md.

- [ ] **Step 5: Stop the server and clean up**

Run: `kill %1` (or the PID from step 2)
Run: `rm .lighthouse-home.json .lighthouse-post.json`

- [ ] **Step 6: If any score is <95**

Pause. Common fixes:
- Performance: ensure all `<img>` are `<Image>`; verify font preload; check for unused JS.
- Accessibility: re-run `pnpm e2e` (axe-core covers a superset).
- Best Practices: check console errors via `pnpm dev` then DevTools.
- SEO: verify metadata tags + sitemap + robots all return 200.

After fixing, re-measure and commit the fix in a separate, descriptive commit before continuing.

If all scores ≥95, proceed to Task 31.

---

### Task 31: MIGRATION.md with Lighthouse baseline

**Files:**
- Create: `MIGRATION.md`

- [ ] **Step 1: Write MIGRATION.md**

Create `MIGRATION.md` (replace the Lighthouse score placeholders with the actual numbers from Task 30):

```markdown
# Migration notes

How the production blog deviates from the prototype at `/Users/red/ClaudeDesign/blog/` and why.

## Architecture

| Decision | Prototype | Production | Why |
|---|---|---|---|
| Drawer modal | div-based with manual focus trap | Native `<dialog>` + `@starting-style` + `transition-behavior: allow-discrete` | Real focus trap, real backdrop, browser-native ESC handling |
| Drawer routing | Modal state in client component | Parallel slot `@drawer` + intercepting route `(.)posts/[slug]` | Direct URLs work, back button closes drawer, RSC-rendered article in the drawer |
| Cover randomness | `Math.random()` in generators | mulberry32 seeded from post slug (`src/lib/prng.ts`) | Deterministic across server/client renders → no hydration mismatch |
| Tweaks panel | `tweaks-panel.jsx` (dev-only) | Removed | Dev-only artifact; not shippable |
| Markdown for comments | n/a | Regex-based subset (`src/lib/markdown.ts`) | Bold, italic, inline code, links — no nesting; documented limitation |

## Phase summaries

- Phase 1 — static MVP, MDX pipeline, cover generators, search index
- Phase 2 — drawer routing, reading progress, related posts, sort, search results page
- Phase 3 — Auth.js, Drizzle + libsql, likes, bookmarks (with anon→signed-in merge), comments
- Phase 4a — `pnpm new-post` CLI, OG/Twitter cards, sitemap, robots, Atom feed, JPG cover manifest, security headers, env validation, Playwright + axe-core, README/CONTRIBUTING/MIGRATION
- Phase 4b — self-host on Mac mini (Docker Compose + Caddy + sqlite volume + backup scripts)

## Lighthouse baseline (Phase 4a)

Measured against `pnpm build && pnpm start` on macOS, headless Chrome, network throttling default.

| URL | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | <FILL FROM TASK 30> | <FILL FROM TASK 30> | <FILL FROM TASK 30> | <FILL FROM TASK 30> |
| `/posts/a-week-in-lisbon-mostly-by-foot` | <FILL FROM TASK 30> | <FILL FROM TASK 30> | <FILL FROM TASK 30> | <FILL FROM TASK 30> |

All categories ≥95.

## Not yet ported

- Real JPG cover photos for the prototype's hand-curated covers (drop into `public/covers/<slug>.jpg`; manifest auto-detects on next build).
- Full Content Security Policy — deferred to Phase 4b at the Caddy layer where we know the production hostname and inline-script hashes.
```

- [ ] **Step 2: Replace the placeholders with actual numbers from Task 30**

Edit `MIGRATION.md`. Replace each `<FILL FROM TASK 30>` with the integer score recorded in Task 30 step 4.

- [ ] **Step 3: Verify nothing remains as a placeholder**

Run: `grep -n 'FILL FROM' MIGRATION.md`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add MIGRATION.md
git commit -s -S -m "docs: MIGRATION with prototype deviations + Lighthouse baseline"
```

---

### Task 32: Final validation

**Files:**
- (No file changes; verification only)

- [ ] **Step 1: Full validate**

Run: `pnpm validate`
Expected: typecheck, lint, all unit tests green.

- [ ] **Step 2: E2E**

Run: `pnpm e2e`
Expected: 6/6 specs pass.

- [ ] **Step 3: Build + start sanity**

Run: `pnpm build`
Expected: build completes.

Run: `pnpm start &`, then:
```
curl -sI http://localhost:3000/ | head -1
curl -sI http://localhost:3000/sitemap.xml | head -1
curl -sI http://localhost:3000/robots.txt | head -1
curl -sI http://localhost:3000/feed.xml | head -1
curl -sI http://localhost:3000/og/default.png | head -1
```
Expected: all five return `HTTP/1.1 200 OK`.

Stop the server.

- [ ] **Step 4: Push**

Run: `git push`
Expected: pushed cleanly to `main`.

Phase 4a is complete.

---

## Spec coverage summary

| Spec section | Tasks |
|---|---|
| Slice 1 (env validation) | Tasks 1–3 |
| Slice 2 (CLI) | Tasks 4–6 |
| Slice 3 (SEO surface) | Tasks 7–12 |
| Slice 4 (build-time assets) | Tasks 13–16 |
| Slice 5 (E2E + a11y) | Tasks 17–26 |
| Slice 6 (hardening + docs) | Tasks 27–31 |
| Final acceptance | Task 32 |

Phase 4b's preview in the spec is intentionally not covered here — it's the next phase's plan.
