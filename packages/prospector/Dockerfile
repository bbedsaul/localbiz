# Prospector API — build from the MONOREPO ROOT (build context = repo root):
#   docker build -f packages/prospector/Dockerfile .
# On Coolify (second app): set "Dockerfile Location" = /packages/prospector/Dockerfile
# and "Base Directory" = / (the repo root is the build context). Port 3001.
#
# Prospector depends on @platform/core (db/places/types) AND sitevitals-engine
# (the scan-prospects flywheel), so we build core → engine → prospector, then
# ship a flattened prod node_modules via `pnpm deploy --prod` (same as the worker
# and web). Runs the Express API (src/api.ts → dist/api.js).
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
# Build core → engine → prospector (prospector depends on both).
COPY packages/core packages/core
COPY packages/sitevitals-engine packages/sitevitals-engine
COPY packages/prospector packages/prospector
RUN pnpm --filter @platform/core build \
  && pnpm --filter sitevitals-engine build \
  && pnpm --filter prospector build
# Flatten prospector's prod deps (incl. built core + engine workspace deps) into
# a self-contained node_modules. Avoids hand-copying pnpm symlinks.
RUN CI=true pnpm --filter prospector deploy --prod --legacy /app/out

# --- Runner ---------------------------------------------------------------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=3001
COPY --from=build /app/out/node_modules ./node_modules
COPY --from=build /app/out/dist ./dist
COPY --from=build /app/out/package.json ./package.json
# config.ts resolves ../config/targets.json relative to dist/, so config/ must
# sit beside dist/ at runtime.
COPY --from=build /app/packages/prospector/config ./config
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3001/health >/dev/null 2>&1 || exit 1
# api.ts only calls app.listen() when run as the entry module — `node dist/api.js`
# satisfies that and binds 0.0.0.0:$API_PORT.
CMD ["node", "dist/api.js"]
