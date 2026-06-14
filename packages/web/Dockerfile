# Next.js web app — build from the MONOREPO ROOT (build context = repo root):
#   docker build -f packages/web/Dockerfile .
# On Coolify: set "Dockerfile Location" = /packages/web/Dockerfile and
# "Base Directory" = / (the repo root is the build context).
#
# We do NOT use Next's `output: standalone` here: the instant-scan route depends
# on the workspace package `sitevitals-engine`, which is in
# serverComponentsExternalPackages — Next won't trace it into standalone, so it
# would be missing at runtime. Instead we ship a flattened prod node_modules via
# `pnpm deploy --prod` (same approach as the worker) and run `next start`.
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
# packageManager in the root package.json pins pnpm to a Node 20-compatible version.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
# All workspace package.jsons are needed for a frozen-lockfile install.
COPY packages/core/package.json packages/core/
COPY packages/prospector/package.json packages/prospector/
COPY packages/sitevitals-engine/package.json packages/sitevitals-engine/
COPY packages/sitevitals-worker/package.json packages/sitevitals-worker/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile

# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so they
# must be present during `next build`. Coolify passes env vars marked as
# "Build Variable" as --build-arg. Server-only secrets (SUPABASE_SERVICE_ROLE_KEY,
# STRIPE_*) are read at RUNTIME and must NOT be baked in here.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1

# Build core → engine first; `next build` then resolves the prebuilt engine
# (web depends on sitevitals-engine depends on @platform/core).
COPY packages/core packages/core
COPY packages/sitevitals-engine packages/sitevitals-engine
COPY packages/web packages/web
RUN pnpm --filter @platform/core build \
  && pnpm --filter sitevitals-engine build \
  && pnpm --filter web build
# Flatten web's prod deps (incl. the built sitevitals-engine workspace dep and
# cheerio) into a self-contained node_modules. Avoids hand-copying pnpm symlinks.
RUN CI=true pnpm --filter web deploy --prod --legacy /app/out

# --- Runner ---------------------------------------------------------------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
# Flattened prod node_modules (has next, sitevitals-engine, cheerio, …) + the
# Next build output + config. `pnpm deploy` copies the package source too; we
# copy .next/config explicitly to be certain they're present.
COPY --from=build /app/out/node_modules ./node_modules
COPY --from=build /app/out/package.json ./package.json
COPY --from=build /app/packages/web/.next ./.next
COPY --from=build /app/packages/web/next.config.mjs ./next.config.mjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1
# `next start` honors PORT/HOSTNAME from the env above.
CMD ["node_modules/.bin/next", "start"]
