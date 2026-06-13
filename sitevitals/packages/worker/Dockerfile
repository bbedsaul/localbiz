# Build from the monorepo root:  docker build -f packages/worker/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
# packageManager in the root package.json pins pnpm to a Node 20-compatible version.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/worker/package.json packages/worker/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile
COPY packages/engine packages/engine
COPY packages/worker packages/worker
RUN pnpm --filter @sitevitals/engine build && pnpm --filter @sitevitals/worker build
# Produce a self-contained prod deployment (flattened node_modules incl. the
# built @sitevitals/engine workspace dep). Avoids hand-copying pnpm symlinks.
RUN CI=true pnpm --filter @sitevitals/worker deploy --prod --legacy /app/out

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/out/node_modules ./node_modules
COPY --from=build /app/out/dist ./dist
COPY --from=build /app/out/package.json ./package.json
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "dist/worker.js"]
