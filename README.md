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
| `E2E_TEST` | no | `0` | `1` enables the test Credentials provider (do not set in production) |

## Authoring

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full content workflow.

## Project structure

See `CLAUDE.md` (or `GEMINI.md`) for the full layout, conventions, and gotchas — written for AI assistants but useful for humans too.

## Tests

- `pnpm test` — Vitest, fast, run before every commit.
- `pnpm e2e` — Playwright + axe-core, slow, run before pushing significant changes. Requires `pnpm exec playwright install chromium` once.

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
