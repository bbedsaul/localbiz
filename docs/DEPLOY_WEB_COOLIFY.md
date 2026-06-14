# Deploying `packages/web` to Coolify (Hostinger VPS)

The web app (Next.js 14, App Router) lives in a pnpm monorepo and depends on the
workspace package `sitevitals-engine`. It therefore must be built with the
**repo root as the Docker build context** — you cannot point Coolify at the
`packages/web` subfolder alone. The repo ships `packages/web/Dockerfile` for
exactly this.

> Why a Dockerfile (and not Nixpacks / Next standalone): the instant-scan route
> imports `sitevitals-engine`, which is externalized (`serverComponentsExternalPackages`).
> Next won't trace it into a standalone bundle, so we ship a flattened prod
> `node_modules` via `pnpm deploy` and run `next start`. See DECISIONS.md
> (2026-06-14).

## 1. Create the application in Coolify

1. **+ New → Application → Public/Private Git Repository**, pick `bbedsaul/localbiz`, branch `main`.
2. **Build Pack: Dockerfile.**
3. **Base Directory:** `/` (the build context must be the repo root).
4. **Dockerfile Location:** `/packages/web/Dockerfile`.
5. **Port:** `3000` (the container listens on `$PORT`, default 3000).
6. **Health check path:** `/` (the Dockerfile also has an internal `HEALTHCHECK`).

## 2. Environment variables

Coolify env vars are **runtime** by default. The `NEXT_PUBLIC_*` ones are
inlined into the browser bundle at **build time**, so each of those must be
marked as a **Build Variable** (Coolify passes build vars as `--build-arg`, which
the Dockerfile declares via `ARG`). The server-only secrets are runtime-only —
do NOT mark them as build variables.

| Variable | Build var? | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ build + runtime | Same Supabase project as the worker. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ build + runtime | Safe in the browser; RLS enforces access. |
| `NEXT_PUBLIC_APP_URL` | ✅ build + runtime | The public URL of THIS app, e.g. `https://app.yourdomain.com`. Used for Stripe redirect/return URLs. |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ runtime only | Server-only (Stripe webhook → DB writes). |
| `STRIPE_SECRET_KEY` | ❌ runtime only | Test key for now; live key at go-live (#38). |
| `STRIPE_WEBHOOK_SECRET` | ❌ runtime only | From the Stripe webhook you create in step 4. |
| `STRIPE_PRICE_SOLO` | ❌ runtime only | Price ID from `setup:stripe`. |
| `STRIPE_PRICE_PRO` | ❌ runtime only | Price ID from `setup:stripe`. |

> In Coolify, a checkbox labelled **"Build Variable / Available at buildtime"**
> appears on each env var — tick it for the three `NEXT_PUBLIC_*` rows.

## 3. Domain

1. Point a DNS A record (e.g. `app.yourdomain.com`) at the VPS IP.
2. In Coolify, set the application **Domain** to `https://app.yourdomain.com`
   (Coolify provisions Let's Encrypt TLS automatically).
3. Make sure `NEXT_PUBLIC_APP_URL` matches that exact URL, then **redeploy**
   (it's baked into the build).

## 4. Post-deploy wiring (Supabase + Stripe)

These mirror the Vercel items on the pre-production checklist — only the host
changes:

- **Supabase Auth** (#7): add `https://app.yourdomain.com/auth/callback` to the
  redirect allowlist and set the Site URL to `https://app.yourdomain.com`.
- **Stripe webhook** (#10): create a webhook endpoint at
  `https://app.yourdomain.com/api/webhooks/stripe`, subscribe to
  `checkout.session.completed` + subscription events, and put its signing secret
  in `STRIPE_WEBHOOK_SECRET` (runtime env), then redeploy.

## 5. Deploy

Click **Deploy**. First build runs core → engine → web then flattens prod deps;
expect a few minutes. Watch the build log; once healthy, hit the domain.

## Updating

Push to `main` (or enable Coolify's auto-deploy webhook) and redeploy. Changing
any `NEXT_PUBLIC_*` value requires a fresh **build** (not just a restart), since
those are compiled in.

---

# Second app: Prospector API (`packages/prospector`)

The Prospector Express API is deployed as its **own** Coolify application (same
VPS, separate container/lifecycle from web). It uses `packages/prospector/Dockerfile`,
built the same way — repo root as context, builds core → engine → prospector,
ships a flattened prod `node_modules`, runs `node dist/api.js`.

## Create the application

1. **+ New → Application**, same repo (`bbedsaul/localbiz`), branch `main`.
2. **Build Pack: Dockerfile.**
3. **Base Directory:** `/` · **Dockerfile Location:** `/packages/prospector/Dockerfile`.
4. **Port:** `3001` (the API listens on `$API_PORT`, default 3001).
5. **Health check path:** `/health` (returns `{"status":"ok"}`; also an internal `HEALTHCHECK`).

## Environment variables (all runtime — Prospector has no `NEXT_PUBLIC_*` build vars)

| Variable | Required? | Notes |
|---|---|---|
| `SUPABASE_URL` | ✅ | Required at boot (core/db constructs the client). Same project as web/worker. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Required at boot. |
| `GOOGLE_API_KEY` | ✅ | Required at boot — `@platform/core/places` throws on import if missing. |
| `API_PORT` | optional | Defaults to `3001`; leave unset unless you change the exposed port too. |
| `STORAGE_BUCKET` | optional | Supabase Storage bucket for prospect photo uploads. |
| `CRON_SCHEDULE` | optional | Only used by the scheduler entry, **not** the API. Harmless to omit. |

> Note: the container runs the **API** (`dist/api.js`), not the cron scheduler
> (`dist/scheduler.js`). If you also want the automated sweep running as a
> service, deploy a third app from the same Dockerfile with the command
> overridden to `node dist/scheduler.js` (no exposed port / health check).

## Domain

Point a separate subdomain (e.g. `prospector.yourdomain.com`) at the VPS and set
it as the app's Domain in Coolify. The API is owner-auth'd (Supabase bearer
tokens via `authMiddleware`); `/health` is the only unauthenticated route.
