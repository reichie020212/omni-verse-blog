# Omni-Verse Blog — Phase 4b Design

**Date:** 2026-04-27
**Author:** Red (with Claude)
**Status:** Approved
**Predecessors:** Phase 4a (`b111155`) — quality bar, SEO, E2E, docs
**Successor:** none planned

---

## 1. Goal

Self-host the Omni-Verse Blog on Red's Mac mini M4 Pro behind Cloudflare Tunnel, ending in a `docker compose up -d` that produces a publicly reachable site at `https://<HOSTNAME>` with auto-renewed TLS, a persistent sqlite volume, automatic daily backups, and CI on GitHub.

This is the deployment phase. No new application features.

---

## 2. Scope

### In scope

1. **Dockerfile** — multi-stage Next.js standalone image
2. **docker-compose.yml** — `web` (Next.js) + `cloudflared` (CF Tunnel daemon)
3. **Production env handling** — `.env.production` (gitignored) + `.env.production.example` (committed)
4. **Migrations on boot** — entrypoint applies Drizzle migrations idempotently
5. **DB bind mount** — `./data:/data` so the sqlite file is host-visible
6. **Health check** — `/api/health` route + Docker `HEALTHCHECK` + CF tunnel health probe
7. **Backups** — host-side `scripts/backup-blog-db.sh` + macOS `launchd` plist, daily at 03:00, 30-day retention
8. **CI** — `.github/workflows/ci.yml` running `pnpm validate` (typecheck + lint + Vitest) on push / PR
9. **DEPLOY.md** — one-time setup walkthrough (CF tunnel creation, OAuth callback config, first deploy, ongoing updates)

### Out of scope

- Caddy / nginx / Traefik (CF Tunnel routes directly to `web:3000`; YAGNI)
- `cloudflared` tunnel auto-provisioning (manual one-time setup in the CF dashboard)
- Watchtower / automated container updates
- Offsite backups beyond Time Machine (no rclone, no R2 sync — accepted gap)
- Strict CSP (deferred indefinitely; the standard headers from Phase 4a remain)
- Playwright in CI (too slow; run locally before release)
- Multi-host / horizontal scaling (sqlite + bind mount is single-host by design)

### Hostname placeholder

Throughout this spec and the deployable artifacts, `<HOSTNAME>` is a placeholder for the production domain (e.g., `blog.example.com`) under Red's Cloudflare-managed zone. Filled in at deploy time in `.env.production`.

---

## 3. Architecture

```
                              ┌─────────────────────────────┐
                              │   Cloudflare edge (TLS)     │
   Internet ▶ HTTPS ───────▶  │   https://<HOSTNAME>        │
                              └─────────────┬───────────────┘
                                            │ outbound
                                            │ persistent
                                            │ tunnel
                              ┌─────────────▼───────────────┐
                              │     Mac mini M4 Pro         │
                              │  ┌──────────────────────┐   │
                              │  │  cloudflared (svc)   │   │
                              │  │  TUNNEL_TOKEN=…      │   │
                              │  └──────────┬───────────┘   │
                              │  http://web:3000  (compose) │
                              │  ┌──────────▼───────────┐   │
                              │  │  web  (Next.js)      │   │
                              │  │  node server.js      │   │
                              │  └──────────┬───────────┘   │
                              │             │ file:/data/   │
                              │  ┌──────────▼───────────┐   │
                              │  │  ./data/local.db     │   │
                              │  │  (host bind mount)   │   │
                              │  └──────────────────────┘   │
                              │             ▲                │
                              │  launchd ── │ daily cp       │
                              │  ./data/backups/             │
                              └─────────────────────────────┘
```

**Two services on a private compose network. No published ports.** The `web` container exposes `3000` only inside the network. `cloudflared` connects out to Cloudflare and proxies inbound requests to `http://web:3000`.

---

## 4. Dockerfile

**File:** `Dockerfile` at repo root.

Multi-stage:

1. **`deps`** — `node:22-alpine`, `pnpm install --frozen-lockfile`
2. **`build`** — copies source, runs `pnpm build`. Build args: `SITE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. The build invokes `pnpm prebuild` (cover-manifest + og-cards + search-index) and `next build`. Build args are needed because `app/sitemap.ts`, `app/robots.ts`, `app/feed.xml/route.ts`, and the OG card script all read `env.SITE_URL` during the static build.
3. **`runner`** — `node:22-alpine`. Copies `.next/standalone` (Next.js's standalone bundle includes only the production `node_modules` it actually uses, including `drizzle-orm` and `@libsql/client`), `.next/static`, `public/`, `drizzle/` (migration SQL files), and `start.mjs` to `/app/start.mjs`. Sets `WORKDIR=/app`, `USER node`, `EXPOSE 3000`, `HEALTHCHECK`, and `CMD ["node", "/app/start.mjs"]` where `start.mjs`:
   - applies Drizzle migrations against `env.DATABASE_URL` using the programmatic migrator (`drizzle-orm/libsql/migrator`)
   - then `await import('./server.js')` (the standalone server entry) to start Next

We use the programmatic migrator (`drizzle-orm`, a production dep) rather than `drizzle-kit` (devDep) so the runner image stays lean and we don't need to ship dev tooling.

**Build args.** Sensitive values like `AUTH_SECRET` and OAuth secrets are accepted as build args because Next.js's static generation reads them at build time (e.g., for the test creds gate, the metadata, etc.). The image must be considered a "secret" artifact — never pushed to a public registry. Acceptable for self-hosted, single-tenant use.

**Image size target:** ~800 MB. Larger than a pure standalone bundle (~250 MB) because the Next.js File Tracer doesn't see `start.mjs` and so trims `drizzle-orm` + `libsql` + the native binding from the standalone `node_modules`. We overlay a full production-only `node_modules` from a separate `prod-deps` stage to restore those packages. 800 MB is fine for a single-tenant personal blog on a Mac mini; revisit if image-pull bandwidth becomes an issue (it won't on a LAN).

---

## 5. docker-compose.yml

**File:** `docker-compose.yml` at repo root.

Two services:

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
    environment:
      TUNNEL_TOKEN: ${TUNNEL_TOKEN}
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

No `ports:` block on `web` — only `cloudflared` (and other compose services on the same internal network) can reach it.

`cloudflared` waits for `web` to pass its health check before starting; this prevents serving 502s on a slow boot.

---

## 6. Production env

**File:** `.env.production.example` (committed, sanitized) and `.env.production` (gitignored).

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

`env.ts`'s zod schema accepts all of these. `AUTH_URL` and `AUTH_TRUST_HOST` are read directly by Auth.js (not through `env.ts`) — adding them to `envSchema` as `optional()` strings is harmless and gives us validation for free.

---

## 7. Migrations on boot

**File:** `scripts/start.mjs` (committed, copied to `/app/start.mjs` and run as the container CMD).

```js
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const url = process.env.DATABASE_URL ?? 'file:/data/local.db';
const client = createClient({ url });
const db = drizzle(client);

await migrate(db, { migrationsFolder: '/app/drizzle' });
client.close();

// Hand off to the Next.js standalone server (sibling file in /app).
await import('./server.js');
```

**Why a wrapper instead of a shell entrypoint:** keeping it in JS means we don't depend on a shell in the alpine runner image, and the `./server.js` import path matches the standalone bundle's entry layout.

**Why the programmatic migrator:** `drizzle-orm/libsql/migrator` is part of `drizzle-orm`, which Next.js's standalone build already bundles into `node_modules`. No need to ship `drizzle-kit` (devDep) or a separate `migrate` step. The migrator reads `migrations/meta/_journal.json` from the `drizzle/` folder and applies anything new — idempotent, safe to run on every container start.

---

## 8. Health check route

**File:** `src/app/api/health/route.ts`

```ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await db.run(sql`SELECT 1`);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 503 },
    );
  }
}
```

Returns `200 {ok:true}` if the sqlite connection works, `503 {ok:false}` otherwise. Used by:
- Dockerfile `HEALTHCHECK` (so `cloudflared` can `depends_on: condition: service_healthy`)
- Cloudflare tunnel's per-route health check (configured in CF dashboard alongside the public hostname)

---

## 9. Backups

**File:** `scripts/backup-blog-db.sh` (committed, executable).

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

DATA_DIR="./data"
BACKUP_DIR="$DATA_DIR/backups"
mkdir -p "$BACKUP_DIR"

# sqlite supports safe online copy via the .backup command, but a plain cp
# of a WAL-mode database is also safe enough here — the worst case is a
# rollback to the last completed write, which is fine for a personal blog.
cp "$DATA_DIR/local.db" "$BACKUP_DIR/local.db.$(date +%F-%H%M)"

# Prune older than 30 days
find "$BACKUP_DIR" -name 'local.db.*' -type f -mtime +30 -delete
```

**File:** `scripts/launchd/com.red.omniverseblog.backup.plist` (committed; user installs via `launchctl bootstrap`).

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
    <string>/path/to/repo/scripts/backup-blog-db.sh</string>
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

User edits the `/path/to/repo/` placeholder before `launchctl bootstrap gui/$UID <plist>`.

Time Machine handles offsite of `./data/backups/`. No rclone or R2 sync — accepted gap.

---

## 10. CI workflow

**File:** `.github/workflows/ci.yml`.

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
      # `src/lib/env.ts` parses process.env at module load.  Any test that
      # imports env.ts (env.test.ts does, transitively or directly) requires
      # AUTH_SECRET ≥32 chars to be present, even if the value is fake.  This
      # is a CI-only fixture — never used to sign anything.
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
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```

Skip Playwright. Skip the production build (it would need OAuth IDs as additional secrets, which is fine but adds friction; the local pre-deploy gate is sufficient).

If a future need surfaces (e.g., an E2E gate before merging), add it then.

---

## 11. DEPLOY.md

A new top-level doc — the deploy walkthrough.

Sections:

1. **Prerequisites** — Mac mini with Docker Desktop / Colima or Orbstack; Cloudflare account with a zone for `<HOSTNAME>`'s parent domain; GitHub + Google OAuth apps.
2. **One-time setup**
   - Create a CF Tunnel (CF dashboard → Zero Trust → Networks → Tunnels → Create), name it `omni-verse-blog`. Copy the token.
   - Add a public hostname: `<HOSTNAME>` → `http://web:3000` (service URL inside compose).
   - Update GitHub OAuth app authorized callback URL to `https://<HOSTNAME>/api/auth/callback/github`.
   - Update Google OAuth client authorized redirect URI to `https://<HOSTNAME>/api/auth/callback/google`.
   - Copy `.env.production.example` to `.env.production`. Fill in: `TUNNEL_TOKEN`, `AUTH_SECRET` (run `pnpm auth:secret`), OAuth IDs/secrets, `AUTH_URL`, `SITE_URL`.
3. **First deploy**
   - `mkdir -p data data/backups` (the bind-mounted dir must exist before `docker compose up`; otherwise Docker creates it as root-owned and the `node` user inside the container can't write to `/data/local.db`)
   - On macOS hosts with Docker Desktop / Orbstack / Colima, the bind mount inherits the host user's permissions automatically — no `chown` needed. If you see `EACCES` on first start, `chmod 0775 data` and retry.
   - `docker compose build web`
   - `docker compose up -d`
   - Watch `docker compose logs -f` until `web` is healthy.
   - Visit `https://<HOSTNAME>` — should serve.
4. **Ongoing updates**
   - `git pull`
   - `docker compose build web`
   - `docker compose up -d` (recreates `web`; `cloudflared` is unaffected)
5. **Backups**
   - Edit the launchd plist's path to your repo.
   - `launchctl bootstrap gui/$UID scripts/launchd/com.red.omniverseblog.backup.plist`
   - Verify next morning that `data/backups/local.db.<today>-0300` exists.
6. **Rollback**
   - `docker compose down web`
   - `cp data/backups/local.db.<good-timestamp> data/local.db`
   - `git checkout <good-sha> && docker compose build web && docker compose up -d`

---

## 12. Risks and trade-offs

| Risk | Mitigation |
|---|---|
| Sensitive build args bake into image layers | Image is private (never pushed to a public registry); `.env.production` gitignored; build context excludes anything secret |
| Build context bloat (e.g., `node_modules`, `.next`) | `.dockerignore` excludes them; pnpm cache is rebuilt cleanly |
| sqlite + bind mount is not multi-host or HA | Accepted; this is a personal blog, not a service |
| Backup script copies a live WAL DB (not `.backup`) | Worst case is a rollback to the last completed write — fine for a blog |
| CF tunnel single point of failure | Acceptable; if CF is down, the blog is down. No SLA needed |
| `cloudflared` image at `:latest` can drift | Pin to a specific version once the deploy is stable; for now, the auto-update behavior of CF Tunnel is desirable for security patches |
| OAuth callbacks tied to one hostname | Documented; if Red ever changes hostname, both OAuth apps need re-registering |
| No alerting on health check failures | Accepted; Red is the user, will notice. Future: simple `curl` cron + email |

---

## 13. Acceptance criteria

Phase 4b is done when:

- [ ] `docker compose build web` produces an image (~800 MB; explained in Section 4)
- [ ] `docker compose up -d` starts both services; `web` reaches `(healthy)` state in <60s
- [ ] `https://<HOSTNAME>` serves the homepage with valid TLS (CF certificate)
- [ ] `https://<HOSTNAME>/api/health` returns `{ok:true}`
- [ ] OAuth sign-in works for both GitHub and Google providers
- [ ] Posting a comment + reloading shows it persists across container restarts (volume working)
- [ ] `scripts/backup-blog-db.sh` produces a timestamped copy in `data/backups/`
- [ ] `launchctl list | grep omniverseblog` shows the backup job loaded
- [ ] `.github/workflows/ci.yml` runs green on push to main
- [ ] `DEPLOY.md` walks through every step end-to-end with no missing pieces
- [ ] Phase 4a's full E2E suite still passes locally (`pnpm e2e`); Vitest still 116/116

---

## 14. Beyond Phase 4b

Optional follow-up phases that are explicitly NOT 4b:

- **Phase 4c (offsite backup):** rclone to CF R2 or B2; encrypted at rest
- **Phase 4d (analytics):** Plausible / Umami self-hosted as a third compose service
- **Phase 4e (admin):** a `/admin` route that lets Red moderate comments without `drizzle-kit studio`
- **Phase 5 (DB migration):** if traffic ever justifies it, swap libsql file mode → libsql server (sqld) sidecar or move to Turso

None of these are blocked by 4b's design.
