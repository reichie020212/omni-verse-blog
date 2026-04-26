# Omni-Verse Blog — Phase 4b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-host the blog on Red's Mac mini behind Cloudflare Tunnel, ending in a `docker compose up -d` that produces a working production stack (Next.js + cloudflared + sqlite volume + daily backups + CI).

**Architecture:** Two-container compose stack — `web` (Next.js standalone image, multi-stage Dockerfile, programmatic Drizzle migrator on boot) and `cloudflared` (CF Tunnel daemon). No published ports; CF terminates TLS at the edge and reaches `web` only via the compose network. Sqlite file lives at `./data/local.db` on the host (bind mount) so a launchd-driven shell script can `cp` it nightly. CI runs `pnpm validate` on push.

**Tech Stack:** Docker Compose v2, `node:22-alpine`, Next.js standalone output, `drizzle-orm/libsql/migrator`, `cloudflare/cloudflared`, GitHub Actions, macOS `launchd`.

**Spec:** `docs/superpowers/specs/2026-04-27-omni-verse-blog-phase-4b-design.md`

**Notes for the implementer:**
- Project conventions live in `CLAUDE.md` and `GEMINI.md` at repo root — read both before starting.
- Commits are signed (`-s -S`) and use conventional-commits prefixes (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- Don't mask command failures with `| tail`. Run validation commands on their own lines.
- Solo-dev project: work directly on `main`. **Memory note:** "inline execution beats subagent-driven for solo-dev plans" (`feedback_inline_over_subagents.md`) — the user prefers inline runs unless they explicitly request subagents.
- `pnpm build` in `package.json` currently runs `db:migrate` before `prebuild + next build`. The Docker build stage **must not call `pnpm build` directly** (it would try to migrate a non-existent DB inside the build container). Run the build steps individually: `pnpm exec tsx scripts/build-cover-manifest.ts && pnpm exec tsx scripts/build-og-cards.ts && pnpm exec tsx scripts/build-search-index.ts && pnpm exec next build`.
- Hostnames in this plan are placeholders. The deployer fills in `<HOSTNAME>` (e.g., `blog.example.com`) at deploy time.

---

## Task 1: `.dockerignore`

**Files:**
- Create: `.dockerignore`

The build context is the repo root. Without a `.dockerignore`, Docker copies everything (including `node_modules`, `.next`, `data/`, `e2e.db`, `.git`) into the build context, which is slow and bakes secrets into image layers.

- [ ] **Step 1: Create `.dockerignore`**

Create `.dockerignore`:

```
# Source-level deps and build artifacts
node_modules
.next
out

# Local dev / test data
data
e2e.db
e2e.db-*
local.db
local.db-journal
playwright-report
test-results
.playwright
public/og
public/search-index.json
src/covers/manifest.ts
.lighthouse-*.json

# Local env files
.env
.env.local
.env.*.local
.env.production

# IDE / OS
.DS_Store
.vscode
.idea

# VCS
.git
.gitignore

# Docs (not needed in image)
docs
README.md
CONTRIBUTING.md
MIGRATION.md
DEPLOY.md

# Tests / CI (not needed in runtime image)
e2e
playwright.config.ts
.github
**/*.test.ts
**/*.test.tsx
src/test
vitest.config.ts
```

The `.next` directory is ignored so the build inside the container starts fresh. `public/og`, `public/search-index.json`, and `src/covers/manifest.ts` are ignored so the production prebuild regenerates them with build-args env values (e.g., the production `SITE_URL`).

- [ ] **Step 2: Commit**

```bash
git add .dockerignore
git commit -s -S -m "chore(docker): .dockerignore excluding build artifacts and local data"
```

---

## Task 2: `Dockerfile` + `scripts/start.mjs`

**Files:**
- Create: `Dockerfile`
- Create: `scripts/start.mjs`

This is the substantive task in the plan: the multi-stage image that builds Next.js, bundles `start.mjs`, and runs migrations on boot.

- [ ] **Step 1: Create `scripts/start.mjs`**

Create `scripts/start.mjs`:

```js
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const url = process.env.DATABASE_URL ?? 'file:/data/local.db';
const client = createClient({ url });
const db = drizzle(client);

// Idempotent: drizzle-orm reads drizzle/meta/_journal.json and applies anything new.
await migrate(db, { migrationsFolder: '/app/drizzle' });
client.close();

// Hand off to the Next.js standalone server (sibling file in /app).
await import('./server.js');
```

- [ ] **Step 2: Create `Dockerfile`**

Create `Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.7

# ---------- deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Build args needed at static-generation time.  These bake into the image —
# image must be private (never push to a public registry).
ARG SITE_URL
ARG AUTH_SECRET
ARG AUTH_GITHUB_ID
ARG AUTH_GITHUB_SECRET
ARG AUTH_GOOGLE_ID
ARG AUTH_GOOGLE_SECRET
ENV SITE_URL=$SITE_URL \
    AUTH_SECRET=$AUTH_SECRET \
    AUTH_GITHUB_ID=$AUTH_GITHUB_ID \
    AUTH_GITHUB_SECRET=$AUTH_GITHUB_SECRET \
    AUTH_GOOGLE_ID=$AUTH_GOOGLE_ID \
    AUTH_GOOGLE_SECRET=$AUTH_GOOGLE_SECRET \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run the prebuild scripts then `next build`.  Skip `db:migrate` (the production
# DB lives on the host bind mount and is migrated at container start).
RUN pnpm exec tsx scripts/build-cover-manifest.ts \
 && pnpm exec tsx scripts/build-og-cards.ts \
 && pnpm exec tsx scripts/build-search-index.ts \
 && pnpm exec next build

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Drop to non-root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only what the runtime needs.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public          ./public
COPY --from=build --chown=nextjs:nodejs /app/drizzle         ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/scripts/start.mjs ./start.mjs

USER nextjs
EXPOSE 3000

# wget is in busybox-alpine; healthcheck hits /api/health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

CMD ["node", "/app/start.mjs"]
```

- [ ] **Step 3: Verify the image builds locally**

Use throwaway test values for the build args. The image will be valid; you just won't have real OAuth secrets in it.

Run from the repo root:

```bash
docker build \
  --build-arg SITE_URL=http://localhost:3000 \
  --build-arg AUTH_SECRET=ci-test-secret-thirty-two-chars-aaaa \
  --build-arg AUTH_GITHUB_ID=test \
  --build-arg AUTH_GITHUB_SECRET=test \
  --build-arg AUTH_GOOGLE_ID=test \
  --build-arg AUTH_GOOGLE_SECRET=test \
  -t omni-verse-blog:dev .
```

Expected: build completes without errors. Total time: ~90s on a Mac mini M4 Pro (~3-4 min on a cold Docker cache).

Verify image size:

```bash
docker images omni-verse-blog:dev --format '{{.Size}}'
```

Expected: ≤ 250 MB. If significantly more, check that `.dockerignore` is excluding `data/`, `e2e.db`, and other large dirs.

- [ ] **Step 4: Smoke-test the image starts**

```bash
mkdir -p /tmp/ovb-data
docker run --rm -d \
  --name ovb-smoke \
  -p 3000:3000 \
  -e DATABASE_URL=file:/data/local.db \
  -e SITE_URL=http://localhost:3000 \
  -e AUTH_SECRET=ci-test-secret-thirty-two-chars-aaaa \
  -e NODE_ENV=production \
  -v /tmp/ovb-data:/data \
  omni-verse-blog:dev
sleep 8
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:3000/
docker stop ovb-smoke
rm -rf /tmp/ovb-data
```

Expected: `200`. (Auth is broken with fake OAuth, but the homepage is anonymous-renderable.)

If the container fails to start, check `docker logs ovb-smoke` before the cleanup. Common issues:
- Migration error: confirm `drizzle/0000_rainy_alice.sql` and `drizzle/meta/_journal.json` were copied into the runner stage.
- Permission error on `/data/local.db`: confirm the host bind-mount path is writable by uid 1001 (the `nextjs` user). On macOS Docker Desktop / Orbstack / Colima this works automatically; on Linux hosts you may need `chmod 0775 /tmp/ovb-data`.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile scripts/start.mjs
git commit -s -S -m "feat(docker): multi-stage image + start.mjs with programmatic migrator"
```

---

## Task 3: `env.ts` accepts `AUTH_URL` and `AUTH_TRUST_HOST`

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `src/lib/env.test.ts`

Auth.js v5 reads `AUTH_URL` and `AUTH_TRUST_HOST` directly from `process.env`. Adding them to `envSchema` is harmless and gives us validation for free, plus prevents typos in `.env.production`.

- [ ] **Step 1: Add the new fields to the schema**

Edit `src/lib/env.ts`. In the `z.object({ ... })` block, add these two fields after `DATABASE_AUTH_TOKEN`:

```ts
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.enum(['true', 'false']).optional(),
```

- [ ] **Step 2: Add tests covering the new fields**

Edit `src/lib/env.test.ts`. Inside the existing `describe('envSchema', ...)` block (after the existing tests, before the closing `})` of the describe), add:

```ts
  it('accepts AUTH_URL when valid', () => {
    expect(() =>
      envSchema.parse({ ...valid, AUTH_URL: 'https://blog.example.com' }),
    ).not.toThrow();
  });

  it('rejects AUTH_URL that is not a URL', () => {
    expect(() => envSchema.parse({ ...valid, AUTH_URL: 'not-a-url' })).toThrow();
  });

  it('accepts AUTH_TRUST_HOST=true', () => {
    const parsed = envSchema.parse({ ...valid, AUTH_TRUST_HOST: 'true' });
    expect(parsed.AUTH_TRUST_HOST).toBe('true');
  });

  it('rejects AUTH_TRUST_HOST=yes', () => {
    expect(() => envSchema.parse({ ...valid, AUTH_TRUST_HOST: 'yes' })).toThrow();
  });
```

- [ ] **Step 3: Run tests**

Run: `pnpm test src/lib/env.test.ts`
Expected: 15/15 passing (existing 11 + 4 new).

- [ ] **Step 4: Run full validate**

Run: `pnpm validate`
Expected: typecheck 0 errors, lint clean, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts
git commit -s -S -m "feat(env): validate optional AUTH_URL and AUTH_TRUST_HOST"
```

---

## Task 4: Health check route (TDD)

**Files:**
- Create: `src/app/api/health/route.ts`
- Create: `src/app/api/health/route.test.ts`

A small route that pings the DB. Returns `200 {ok:true}` on success, `503 {ok:false, error}` on DB failure. Used by the Docker `HEALTHCHECK` and CF Tunnel's per-route health probe.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/health/route.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const runMock = vi.fn();
vi.mock('@/lib/db', () => ({
  db: { run: runMock },
}));

import { GET } from './route';

describe('GET /api/health', () => {
  beforeEach(() => {
    runMock.mockReset();
  });

  it('returns 200 {ok:true} when the DB ping succeeds', async () => {
    runMock.mockResolvedValueOnce(undefined);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 503 {ok:false, error} when the DB ping fails', async () => {
    runMock.mockRejectedValueOnce(new Error('libsql: closed'));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('libsql');
  });

  it('returns 503 with a generic message when the error is not an Error instance', async () => {
    runMock.mockRejectedValueOnce('weird thrown value');
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/app/api/health/route.test.ts`
Expected: FAIL with "Cannot find module './route'" or similar import-resolution error.

- [ ] **Step 3: Implement the route**

Create `src/app/api/health/route.ts`:

```ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await db.run(sql`SELECT 1`);
    return Response.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'unknown';
    return Response.json({ ok: false, error }, { status: 503 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/app/api/health/route.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Run full validate**

Run: `pnpm validate`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/health/route.ts src/app/api/health/route.test.ts
git commit -s -S -m "feat(health): /api/health route with DB ping for Docker + CF probe"
```

---

## Task 5: `docker-compose.yml` + `.env.production.example` + `.gitignore`

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.production.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create `docker-compose.yml`**

Create `docker-compose.yml`:

```yaml
services:
  web:
    build:
      context: .
      args:
        SITE_URL: ${SITE_URL}
        AUTH_SECRET: ${AUTH_SECRET}
        AUTH_GITHUB_ID: ${AUTH_GITHUB_ID}
        AUTH_GITHUB_SECRET: ${AUTH_GITHUB_SECRET}
        AUTH_GOOGLE_ID: ${AUTH_GOOGLE_ID}
        AUTH_GOOGLE_SECRET: ${AUTH_GOOGLE_SECRET}
    image: omni-verse-blog:latest
    env_file: .env.production
    volumes:
      - ./data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    env_file: .env.production
    restart: unless-stopped
    depends_on:
      web:
        condition: service_healthy
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

The `web` service has no `ports:` block — only `cloudflared` (and other compose services on the same network) can reach it.

- [ ] **Step 2: Create `.env.production.example`**

Create `.env.production.example`:

```
# Cloudflare Tunnel — get from CF dashboard → Zero Trust → Networks → Tunnels
TUNNEL_TOKEN=

# Auth.js
AUTH_SECRET=                # generate via `pnpm auth:secret`
AUTH_URL=https://<HOSTNAME> # e.g., https://blog.example.com
AUTH_TRUST_HOST=true        # required behind a proxy

# OAuth — GitHub app callback: https://<HOSTNAME>/api/auth/callback/github
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# OAuth — Google client callback: https://<HOSTNAME>/api/auth/callback/google
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Database — sqlite file inside the bind-mounted /data volume
DATABASE_URL=file:/data/local.db

# Public origin (sitemap, robots, feed, OG)
SITE_URL=https://<HOSTNAME>

# Hard-pin so the test Credentials provider stays off in prod
E2E_TEST=0
NODE_ENV=production
```

- [ ] **Step 3: Update `.gitignore`**

Append to `.gitignore`:

```
# Phase 4b — production deploy state
.env.production
data/
```

- [ ] **Step 4: Verify compose config is well-formed**

Create a temporary `.env.production` from the example with throwaway values so `docker compose config` can resolve interpolation:

```bash
cp .env.production.example .env.production
# Open .env.production in your editor and replace the empty fields with throwaway values
# (e.g., AUTH_SECRET=ci-test-secret-thirty-two-chars-aaaa, TUNNEL_TOKEN=fake, etc.)
```

Then validate:

```bash
docker compose config --quiet
echo "exit=$?"
```

Expected: `exit=0`. (Any unset interpolated variables cause a non-zero exit.)

Now delete the throwaway `.env.production` so it doesn't get committed:

```bash
rm .env.production
```

- [ ] **Step 5: Confirm `.env.production` is correctly gitignored**

```bash
echo "tmp" > .env.production
git status --short | grep -E '\.env\.production$' && echo "BAD: .env.production is tracked"
git status --short | grep -qE '\.env\.production$' || echo "OK: gitignored"
rm .env.production
```

Expected: `OK: gitignored`. (If `BAD:` appears, the gitignore line is wrong.)

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.production.example .gitignore
git commit -s -S -m "feat(docker): compose stack + env.production.example"
```

---

## Task 6: Backup script + launchd plist

**Files:**
- Create: `scripts/backup-blog-db.sh` (executable)
- Create: `scripts/launchd/com.red.omniverseblog.backup.plist`

- [ ] **Step 1: Create the backup script**

Create `scripts/backup-blog-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

DATA_DIR="./data"
BACKUP_DIR="$DATA_DIR/backups"
SOURCE="$DATA_DIR/local.db"

if [ ! -f "$SOURCE" ]; then
  echo "no DB at $SOURCE; nothing to back up" >&2
  exit 0
fi

mkdir -p "$BACKUP_DIR"

# A plain cp of a WAL-mode sqlite file is safe enough for a personal blog —
# worst case is a rollback to the last completed write.  For a stricter guarantee
# we'd shell into the container and run `.backup`, but that adds complexity for
# negligible benefit here.
cp "$SOURCE" "$BACKUP_DIR/local.db.$(date +%F-%H%M)"

# Prune anything older than 30 days.
find "$BACKUP_DIR" -name 'local.db.*' -type f -mtime +30 -delete
```

Make it executable:

```bash
chmod +x scripts/backup-blog-db.sh
```

- [ ] **Step 2: Create the launchd plist**

Create `scripts/launchd/com.red.omniverseblog.backup.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.red.omniverseblog.backup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/REPLACE/WITH/ABSOLUTE/PATH/TO/REPO/scripts/backup-blog-db.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>3</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/tmp/omniverseblog-backup.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/omniverseblog-backup.err.log</string>
</dict>
</plist>
```

The `/REPLACE/WITH/ABSOLUTE/PATH/TO/REPO/` placeholder is intentional — Red edits this once on the Mac mini before loading the agent. DEPLOY.md (Task 8) walks through the install command.

- [ ] **Step 3: Smoke-test the backup script**

Create a fake DB and run the script to confirm it copies and prunes:

```bash
mkdir -p data
echo "fake-db-content" > data/local.db
./scripts/backup-blog-db.sh
ls data/backups/
```

Expected: one file matching `local.db.YYYY-MM-DD-HHMM`, content matches `data/local.db`.

Clean up:

```bash
rm -rf data
```

- [ ] **Step 4: Commit**

```bash
git add scripts/backup-blog-db.sh scripts/launchd/com.red.omniverseblog.backup.plist
git commit -s -S -m "feat(backup): nightly sqlite backup script + launchd plist"
```

---

## Task 7: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    env:
      # `src/lib/env.ts` parses process.env at module load.  env.test.ts
      # imports the side-effecting module, which requires AUTH_SECRET ≥32 chars
      # to be present.  This is a CI-only fixture — never used to sign anything.
      AUTH_SECRET: ci-test-secret-thirty-two-chars-aaaa

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -s -S -m "ci: GitHub Actions runs pnpm validate on push and PR"
```

(The workflow runs on the next push. There's no way to fully verify it locally without actions runners; the YAML is small and matches the existing `pnpm validate` chain.)

---

## Task 8: `DEPLOY.md`

**Files:**
- Create: `DEPLOY.md`

- [ ] **Step 1: Write DEPLOY.md**

Create `DEPLOY.md`:

````markdown
# Deploying Omni-Verse Blog

Self-host on a Mac mini behind Cloudflare Tunnel via Docker Compose. The blog is reachable at `https://<HOSTNAME>` (a name you control under a Cloudflare-managed DNS zone). CF terminates TLS at the edge; no port-forwarding on your home network.

## Prerequisites

- Mac mini (or any host) with Docker Engine + Compose v2. Orbstack, Docker Desktop, or Colima all work.
- A Cloudflare account with a zone for the parent domain of `<HOSTNAME>` (e.g., `example.com` if hostname is `blog.example.com`).
- A GitHub OAuth app and a Google OAuth client.

## One-time setup

### 1. Cloudflare Tunnel

1. CF dashboard → Zero Trust → Networks → Tunnels → **Create a tunnel**.
2. Pick the connector type "Cloudflared". Name it `omni-verse-blog`. Save.
3. Copy the **token** shown on the next page. (Format: a long opaque string. Stays the same for the life of the tunnel.)
4. Switch to the tunnel's **Public Hostnames** tab → **Add a public hostname**:
   - Subdomain: `<the host part, e.g. blog>`
   - Domain: `<your zone, e.g. example.com>`
   - Service: `Type=HTTP`, `URL=web:3000`
   - Save.

### 2. OAuth callbacks

For each OAuth provider, add the production callback URL.

- **GitHub** — github.com/settings/developers → your OAuth app → Authorization callback URL → add `https://<HOSTNAME>/api/auth/callback/github`. Update.
- **Google** — Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 client → Authorized redirect URIs → add `https://<HOSTNAME>/api/auth/callback/google`. Save.

You can keep the existing local callbacks (`http://localhost:3000/...`) alongside the production ones — both work.

### 3. Environment file

```bash
cp .env.production.example .env.production
# Then edit .env.production:
#   TUNNEL_TOKEN     ← step 1.3 above
#   AUTH_SECRET      ← run `pnpm auth:secret` and paste the output
#   AUTH_URL         ← https://<HOSTNAME>
#   AUTH_TRUST_HOST  ← keep as "true"
#   AUTH_GITHUB_ID/SECRET, AUTH_GOOGLE_ID/SECRET ← from the OAuth apps
#   SITE_URL         ← https://<HOSTNAME>
```

Verify with: `docker compose config --quiet && echo OK` (should print `OK`).

### 4. Data directory

```bash
mkdir -p data data/backups
```

## First deploy

```bash
docker compose build web
docker compose up -d
docker compose logs -f
```

Watch until `web` reports `healthy` (~30s). Then visit `https://<HOSTNAME>`.

If sign-in works for both providers and you can post + delete a comment, the deploy is good.

## Ongoing updates

```bash
git pull
docker compose build web
docker compose up -d
```

This recreates the `web` container and leaves `cloudflared` alone. Total downtime: 5-15s during container swap. The data volume persists.

## Backups

Edit `scripts/launchd/com.red.omniverseblog.backup.plist` and replace `/REPLACE/WITH/ABSOLUTE/PATH/TO/REPO/` with the absolute path to your repo on the Mac mini.

Install the launchd agent:

```bash
launchctl bootstrap gui/$UID scripts/launchd/com.red.omniverseblog.backup.plist
launchctl list | grep omniverseblog  # should show the loaded agent
```

The next morning, verify `data/backups/local.db.YYYY-MM-DD-0300` exists.

To uninstall: `launchctl bootout gui/$UID scripts/launchd/com.red.omniverseblog.backup.plist`.

Time Machine handles offsite of `data/backups/`.

## Rollback

```bash
docker compose stop web
cp data/backups/local.db.<good-timestamp> data/local.db
git checkout <good-sha>
docker compose build web
docker compose up -d
```

## Troubleshooting

- **`web` keeps restarting.** Check `docker compose logs web`. Common: migration failure (`drizzle/` not bundled — confirm the runner stage `COPY` of `drizzle`); permission error on `/data` (run `chmod 0775 data` on the host).
- **`cloudflared` exits immediately.** `TUNNEL_TOKEN` empty or invalid. Re-copy from CF dashboard.
- **`https://<HOSTNAME>` returns 502 or "no available service".** The tunnel's public hostname URL is wrong. Should be `http://web:3000` (the compose service name, not localhost).
- **Sign-in redirects loop.** `AUTH_URL` doesn't match the actual host. Set `AUTH_URL=https://<HOSTNAME>` exactly.
- **Sign-in errors `UntrustedHost`.** Set `AUTH_TRUST_HOST=true`.
- **Image build fails on `pnpm exec next build`.** Confirm all six build args are passed (especially `AUTH_SECRET` ≥32 chars).
````

- [ ] **Step 2: Commit**

```bash
git add DEPLOY.md
git commit -s -S -m "docs: DEPLOY.md walkthrough — CF tunnel, OAuth, compose, backups, rollback"
```

---

## Task 9: Final validation

**Files:**
- (No file changes; verification only)

- [ ] **Step 1: Full unit + lint + typecheck pass**

```bash
pnpm validate
```

Expected: all green. (Should report 123/123 unit tests after Phase 4b additions: 116 from Phase 4a + 4 new env tests + 3 new health-route tests = 123. Confirm the actual count matches.)

- [ ] **Step 2: E2E suite still green**

```bash
pnpm e2e
```

Expected: 6/6 passing. Phase 4b touches `src/lib/env.ts` and adds `src/app/api/health/route.ts`; neither should affect E2E flows. If something breaks here, treat as a regression and fix before continuing.

- [ ] **Step 3: Image builds locally**

```bash
docker build \
  --build-arg SITE_URL=http://localhost:3000 \
  --build-arg AUTH_SECRET=ci-test-secret-thirty-two-chars-aaaa \
  --build-arg AUTH_GITHUB_ID=test \
  --build-arg AUTH_GITHUB_SECRET=test \
  --build-arg AUTH_GOOGLE_ID=test \
  --build-arg AUTH_GOOGLE_SECRET=test \
  -t omni-verse-blog:dev .
docker images omni-verse-blog:dev --format '{{.Size}}'
```

Expected: build succeeds, image size ≤ 250 MB.

- [ ] **Step 4: Compose config valid**

```bash
cp .env.production.example .env.production
# In .env.production, fill in throwaway values:
#   TUNNEL_TOKEN=fake
#   AUTH_SECRET=ci-test-secret-thirty-two-chars-aaaa
#   AUTH_GITHUB_ID=test  (etc.)
docker compose config --quiet && echo OK
rm .env.production
```

Expected: `OK`.

- [ ] **Step 5: Push**

```bash
git push origin main
```

The push triggers the new GitHub Actions workflow. Watch the Actions tab; expect green within ~3 min.

Phase 4b is complete on the codebase. The actual production deploy on the Mac mini follows DEPLOY.md.
