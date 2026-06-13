# web

Next.js 14 (App Router) marketing site, 3-minute onboarding, and owner dashboard.

> **Node ≥ 18.17 required** (Next.js 14). This repo's other packages run on 18.16;
> use Node 20 for web (`nvm use 20`). Vercel builds on Node 20 by default.

## What's here

- **Landing** (`/`) — headline, live "Scan my site free" hero (the acquisition
  engine — runs a limited instant scan, gates the full report behind signup),
  how-it-works, sample report, Solo/Pro pricing.
- **Onboarding** (`/onboarding`) — 5 steps with a progress bar: site details →
  listing discovery → editable keywords → **live instant scan** (streamed check
  completions, ending on the on-screen grade) → magic-link signup → Stripe
  checkout (14-day trial, card required).
- **Dashboard** (`/dashboard`) — overview (grade, recharts trend, category bars,
  alerts banner), checks detail (plain-English findings via the engine's
  `prioritizeIssues`), report archive (renders stored report HTML), settings
  (keywords + alert contacts), billing (Stripe customer portal).

## Architecture notes

- **Auth**: Supabase magic links via `@supabase/ssr`. Middleware refreshes the
  session and guards `/dashboard`.
- **Data**: all owner reads/writes go through the **anon key + RLS** (owner
  scoped by `owner_user_id = auth.uid()` — see `migrations/001_init.sql`). The
  service-role key is used **only** in the Stripe webhook.
- **Instant scan**: `/api/scan` is a Node-runtime SSE route that imports
  `sitevitals-engine` and runs the no-API-key checks (uptime, SSL, HTTPS,
  domain, crawl), streaming each completion. PageSpeed / SERP / listings /
  Safe Browsing are deferred to the worker's full scan after signup. This keeps
  onboarding genuinely instant and avoids a Redis round-trip in the web tier.
- **First full scan**: creating the business sets `active = true`; the worker
  picks it up on its next uptime/weekly tick. (No web→Redis coupling.)

## Setup

1. Apply `packages/worker/migrations/002_billing.sql` (adds Stripe columns).
2. `cp .env.local.example .env.local` and fill in the Supabase values (anon +
   service-role from the same project as the worker). Stripe is optional.
3. From the monorepo root, with Node 20:
   ```sh
   pnpm --filter sitevitals-engine build   # web imports the built engine
   pnpm --filter web dev         # http://localhost:3000
   ```

## Stripe (optional)

- Create two recurring prices (Solo $29, Pro $49) → `STRIPE_PRICE_SOLO/PRO`.
- Set `STRIPE_SECRET_KEY`. Without it, onboarding skips checkout → dashboard.
- Webhook: point Stripe at `/api/webhooks/stripe` for
  `checkout.session.completed` and `customer.subscription.*`; set
  `STRIPE_WEBHOOK_SECRET`. It syncs `plan` / `subscription_status` / `active`
  onto the business row.

## Deploy (Vercel)

Root directory: repo root; build command `pnpm --filter sitevitals-engine build && pnpm --filter web build`; output handled by Next. Set all env vars in the Vercel project. The Supabase magic-link redirect URL must include `https://<your-vercel-domain>/auth/callback`.
