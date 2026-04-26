# Deploying Omni-Verse Blog

Self-host on a Mac mini behind Cloudflare Tunnel via Docker Compose. The blog is reachable at `https://<HOSTNAME>` (a name you control under a Cloudflare-managed DNS zone). CF terminates TLS at the edge; no port-forwarding on your home network.

## Architecture at a glance

- **`web`** — Next.js standalone container (multi-stage Dockerfile, `output: 'standalone'`). Runs Drizzle migrations on every start via `scripts/start.mjs`, then serves on port 3000 inside the compose network. Health check at `/api/health` (DB ping).
- **`cloudflared`** — Cloudflare Tunnel daemon. Holds a persistent outbound connection to CF's edge and proxies inbound `https://<HOSTNAME>` traffic to `http://web:3000`. No port-forwarding required.
- **`./data/local.db`** — sqlite file on a host bind mount. Survives container recreation. Backed up nightly by a host launchd job.
- **Image size** — ~800 MB (the standalone bundle + an overlaid prod `node_modules` so the migrator can resolve `drizzle-orm/libsql/migrator` at boot). Larger than a pure standalone but acceptable for a single-tenant deploy.

## Prerequisites

- Mac mini (or any host) with Docker Engine + Compose v2. Orbstack, Docker Desktop, or Colima all work.
- A Cloudflare account with a zone for the parent domain of `<HOSTNAME>` (e.g., `example.com` if hostname is `blog.example.com`).
- A GitHub OAuth app and a Google OAuth client.
- ~3 GB free disk for the build cache + image (~800 MB image + Docker layers).

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

Verify with: `docker compose --env-file .env.production config --quiet && echo OK`.

### 4. Data directory

```bash
mkdir -p data data/backups
```

## Pre-deploy validation

Before building the image, sanity-check the codebase locally:

```bash
pnpm install --frozen-lockfile
pnpm validate           # typecheck + lint + 123 unit tests
pnpm e2e                # 6 Playwright specs (slow, ~50s; requires `pnpm exec playwright install chromium` once)
```

GitHub Actions also runs `pnpm validate` on every push to `main` (see `.github/workflows/ci.yml`). The Actions tab is green = the code is in a deployable state.

## First deploy

The build needs the env vars from `.env.production` for interpolation, so pass `--env-file` explicitly:

```bash
docker compose --env-file .env.production build web
docker compose --env-file .env.production up -d
docker compose logs -f
```

The first build takes 2–4 minutes (multi-stage, downloads `node:22-alpine`, runs `pnpm install` twice, runs `pnpm prebuild` + `next build`). Subsequent builds are 30–90 seconds with cache.

Watch until `web` reports `healthy` (~30s after start). Then visit `https://<HOSTNAME>`.

If sign-in works for both providers and you can post + delete a comment, the deploy is good. For a feature-by-feature tour of what should be working, see [`docs/guide/reader.md`](./docs/guide/reader.md).

> **Tip.** To avoid typing `--env-file .env.production` every time, set `COMPOSE_ENV_FILES=.env.production` in your shell rc, or symlink: `ln -s .env.production .env` (Docker auto-loads `.env`).

## Ongoing updates

```bash
git pull
docker compose --env-file .env.production build web
docker compose --env-file .env.production up -d
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
docker compose --env-file .env.production build web
docker compose --env-file .env.production up -d
```

## Troubleshooting

- **`web` keeps restarting.** Check `docker compose logs web`. Common: migration failure (`drizzle/` not bundled — confirm the runner stage `COPY` of `drizzle`); permission error on `/data` (run `chmod 0775 data` on the host).
- **`web` starts but `/api/health` returns 503.** The DB ping failed. Check that `data/local.db` exists and is writable by uid 1001 (the `nextjs` user inside the container).
- **`cloudflared` exits immediately.** `TUNNEL_TOKEN` empty or invalid. Re-copy from CF dashboard.
- **`https://<HOSTNAME>` returns 502 or "no available service".** The tunnel's public hostname URL is wrong. Should be `http://web:3000` (the compose service name, not localhost).
- **Sign-in redirects loop.** `AUTH_URL` doesn't match the actual host. Set `AUTH_URL=https://<HOSTNAME>` exactly.
- **Sign-in errors `UntrustedHost`.** Set `AUTH_TRUST_HOST=true`.
- **Sign-in lands on the wrong page after authentication.** Auth.js v5 reads `AUTH_URL` for redirect computation. Confirm it's set in `.env.production`.
- **Image build fails on `pnpm exec next build`.** Confirm all six build args are passed (especially `AUTH_SECRET` ≥32 chars). The `--env-file .env.production` flag is required — without it, build args are blank.
- **Image build fails with "module not found: drizzle-orm".** The runner stage's `prod-deps` overlay isn't being applied. Check the Dockerfile's `COPY --from=prod-deps` step is present and points at `./node_modules`.
- **Backups not running.** `launchctl list | grep omniverseblog` should show the agent. If empty, re-run the `launchctl bootstrap` command. Check `/tmp/omniverseblog-backup.log` and `/tmp/omniverseblog-backup.err.log` for errors. The plist's `ProgramArguments` path must be absolute (no `~` or `$HOME`).
- **OAuth callback mismatch errors.** GitHub/Google OAuth apps must list the production callback URL (`https://<HOSTNAME>/api/auth/callback/<provider>`). The host part is case-sensitive on some providers.

## Sibling docs

- [`README.md`](./README.md) — quick start for local dev
- [`MIGRATION.md`](./MIGRATION.md) — deviations from the prototype + Lighthouse baseline
- [`docs/guide/`](./docs/guide/) — visual tour of the deployed product
- [`CLAUDE.md`](./CLAUDE.md) / [`GEMINI.md`](./GEMINI.md) — project conventions and gotchas (also useful for humans)
