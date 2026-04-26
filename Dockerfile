# syntax=docker/dockerfile:1.7

# ---------- deps (full, for build) ----------
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- prod-deps (runtime modules only) ----------
# The Next.js standalone bundle's nft trims node_modules to what app code
# imports.  start.mjs lives outside the bundle and imports
# drizzle-orm/libsql/migrator at boot — and drizzle-orm transitively requires
# libsql + its platform native binding (@libsql/linux-arm64-musl on alpine arm64).
# Easiest: install full prod deps in a separate stage and overlay them onto the
# standalone copy so all native bindings are resolved correctly.
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Build args needed at static-generation time. These bake into the image —
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

# Run the prebuild scripts then `next build`. Skip `db:migrate` (the production
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

# Copy the Next.js standalone bundle (server.js + .next/ + trimmed node_modules).
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public          ./public
COPY --from=build --chown=nextjs:nodejs /app/drizzle         ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/scripts/start.mjs ./start.mjs

# Overlay full prod node_modules so start.mjs can resolve drizzle-orm/libsql/migrator
# and so libsql's native binding (@libsql/linux-arm64-musl) is present.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

# wget is in busybox-alpine; healthcheck hits /api/health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

CMD ["node", "/app/start.mjs"]
