# Build from the monorepo root:  docker build -f packages/worker/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/worker/package.json packages/worker/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile
COPY packages/engine packages/engine
COPY packages/worker packages/worker
RUN pnpm --filter @sitevitals/engine build && pnpm --filter @sitevitals/worker build
RUN pnpm prune --prod

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/engine/node_modules ./packages/engine/node_modules
COPY --from=build /app/packages/engine/dist ./packages/engine/dist
COPY --from=build /app/packages/engine/package.json ./packages/engine/
COPY --from=build /app/packages/worker/node_modules ./packages/worker/node_modules
COPY --from=build /app/packages/worker/dist ./packages/worker/dist
COPY --from=build /app/packages/worker/package.json ./packages/worker/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "packages/worker/dist/worker.js"]
