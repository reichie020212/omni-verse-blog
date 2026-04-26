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
- Phase 4b — self-host on Mac mini: multi-stage Dockerfile, `docker-compose.yml` with `web` + `cloudflared` services, programmatic Drizzle migrator on container start, `/api/health` route, host-side launchd backup, GitHub Actions CI

## Phase 4b deviations from the original spec

The Phase 4b spec assumed a Caddy reverse proxy with Let's Encrypt. We dropped Caddy in favor of **Cloudflare Tunnel** routing directly to the Next.js container — CF terminates TLS at the edge, so there's no second proxy and no port-forwarding. This also simplifies `docker-compose.yml` (two services instead of three).

The image overlays a full production `node_modules` from a `prod-deps` stage onto the Next.js standalone bundle so `scripts/start.mjs` can resolve `drizzle-orm/libsql/migrator` and the libsql native binding at boot. This pushes the image to ~800 MB; acceptable for a single-tenant Mac mini deploy.

## Lighthouse baseline (Phase 4a, 2026-04-27)

Measured against `pnpm build && pnpm start` on macOS, headless Chrome, default mobile throttling.

| URL | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` (magazine grid, 14 cards) | 88 | 96 | 96 | 100 |
| `/posts/a-week-in-lisbon-mostly-by-foot` | 96 | 96 | 96 | 100 |

Post page hits the ≥95 target across all four categories. Home page falls short of the 95 target on Performance only — the magazine grid renders 14 inline SVG covers server-side, which inflates DOM size and pushes LCP to ~3.2s under mobile throttling. Acceptable for a personal blog; getting to 95 would require either lazy-rendering below-the-fold cards or replacing SVG generators with optimized PNGs (loses the deterministic prng feature). Revisit if traffic or user feedback warrants it.

a11y is strong (96) thanks to the axe-core integration in Playwright catching real WCAG violations during Phase 4a (e.g., low-contrast `--fg-faint` was flagged and fixed).

## Not yet ported

- Real JPG cover photos for the prototype's hand-curated covers (drop into `public/covers/<slug>.jpg`; manifest auto-detects on next build).
- Full Content Security Policy — would need to be set at Cloudflare's edge (Workers / Page Rules) since CF Tunnel routes plain HTTP to the origin. Deferred indefinitely; the standard headers from Phase 4a (HSTS in prod, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are in place.
- Offsite backups — Time Machine handles this for now. Optional future: rclone to CF R2.
