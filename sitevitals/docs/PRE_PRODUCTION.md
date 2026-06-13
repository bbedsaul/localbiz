# SiteVitals — Pre-Production Checklist

Living list of everything still needed before onboarding real, paying customers.
Updated as work lands. **Last updated: 2026-06-13.**

Status legend: ☐ todo · ◑ partial / in progress · ☑ done (kept here for context)

---

## 0. Where we are today

- ☑ **Engine** (`packages/engine`) — all C1–C7 checks, scoring, report pipeline, CLI. 93 tests.
- ☑ **Worker** (`packages/worker`) — scheduling, persistence, alerts, monthly reports. **Deployed & live on Fly** (`sitevitals-worker.fly.dev`), health check passing.
- ☑ **Web** (`packages/web`) — landing, onboarding, dashboard. Builds clean; runs locally. **Not yet deployed.**
- ☑ Supabase migrations `001` + `002` applied. Test data cleaned out (DB is empty).

---

## 1. P0 — Email deliverability (PRD calls this P0; the report email IS the product)

- ☐ Verify a sending domain in Resend (ideally a dedicated subdomain, e.g. `mail.localmarketz.com`).
- ☐ Add DKIM / SPF / DMARC DNS records from day one.
- ☐ Update sender everywhere to the verified domain:
  - worker Fly secret `REPORT_FROM_EMAIL` (currently `onboarding@resend.dev` — test sender, only delivers to the Resend signup address).
  - `sitevitals/.env` `REPORT_FROM_EMAIL` (currently `reports@localmarketz.com`, an **unverified** domain — will 4xx until verified).
- ☐ Warm up the sending domain before volume.
- ⚠️ Until done: all report/alert email only reaches `bbedsaul@gmail.com` (the Resend account email).

## 2. P0 — Deploy the web app (Vercel)

- ☐ Deploy `packages/web` to Vercel (root dir = repo root; build `pnpm --filter @sitevitals/engine build && pnpm --filter @sitevitals/web build`).
- ☐ Set web env vars on Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (the Vercel domain), Stripe vars (see §3).
- ☐ Supabase Auth config: add `https://<vercel-domain>/auth/callback` to the redirect allowlist; set Site URL. Magic links won't work until this is done.
- ☐ Confirm the Node 20 runtime (Next 14 needs ≥18.17; Vercel defaults to 20).

## 3. Stripe / billing (code complete — account side outstanding)

- ☐ Add a real `STRIPE_SECRET_KEY` (currently an **empty** placeholder in `.env`).
- ☐ Run `pnpm --filter @sitevitals/web setup:stripe` → creates Solo/Pro prices → set `STRIPE_PRICE_SOLO` / `STRIPE_PRICE_PRO`.
- ☐ Create the Stripe webhook → `https://<vercel-domain>/api/webhooks/stripe` (events: `checkout.session.completed`, `customer.subscription.*`) → set `STRIPE_WEBHOOK_SECRET`.
- ☐ End-to-end test: onboarding → checkout (test card) → webhook flips business to `active`/`trialing` → customer portal opens.
- ☑ Migration `002` (Stripe columns) applied; checkout action, webhook sync, portal all built.

## 4. Check API keys (most checks are skipped without these)

Set as worker Fly secrets (and `packages/web/.env.local` for the onboarding instant scan, though that only uses the no-key checks):

- ☐ `PAGESPEED_API_KEY` — C2 performance + C3 mobile (current `GOOGLE_API_KEY` 403s for PageSpeed).
- ☐ SERP provider for C4: `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` (or `SERP_PROVIDER=serpapi` + `SERPAPI_KEY`).
- ☐ `GOOGLE_PLACES_API_KEY` — C5 Google listing.
- ☐ `YELP_API_KEY` — C5 Yelp listing.
- ☐ `FACEBOOK_ACCESS_TOKEN` — C5 Facebook (optional; degrades gracefully).
- ☐ Enable Safe Browsing API on the Google key — C7.
- ☐ `ANTHROPIC_API_KEY` on the worker — AI report narration (currently falls back to the deterministic template).

## 5. Worker ops hardening

- ☐ Upstash eviction policy → `noeviction` (currently `optimistic-volatile`; BullMQ warns jobs can be evicted).
- ☐ Point the Resend webhook at `https://sitevitals-worker.fly.dev/webhooks/resend` (events `email.opened`, `email.clicked`) and set worker secret `RESEND_WEBHOOK_SECRET` → populates `reports.opened_at` / `clicked_at`.
- ☐ Set `SENTRY_DSN` on the worker (wired, currently unset).
- ☐ Confirm the single always-on machine stays up (`auto_stop_machines=false`, `min_machines_running=1`); ensure it never scales to 2 (would double-fire schedulers).
- ☐ Decide alert/ from-email split: `ALERT_FROM_EMAIL` vs `REPORT_FROM_EMAIL`.

## 6. Web — gaps & follow-ups

- ☐ Full onboarding → paid-trial run in <3 min against the live worker (the stated acceptance — needs Stripe + verified Supabase anon key wired in Vercel).
- ☐ Mobile-device QA pass (owners onboard from phones).
- ☐ Rate-limit / abuse-protect the public unauthenticated `/api/scan` (free hero scan is a DoS/cost vector).
- ☐ Sentry on the web app.
- ☐ Multi-site support (the `multi` plan): onboarding + dashboard currently assume one business per owner (`getPrimaryBusiness`).
- ☐ Landing page: real copy, an actual product screenshot (currently a rendered mock), legal/footer links.
- ☐ "Scan any site" free standalone tool — PRD open question (launch with v1 or after?).
- ☐ No automated tests in `packages/web` yet.

## 7. Engine — deferred check work

- ☐ C3 tap-target sizing (engine currently does viewport + mobile Lighthouse only; PageSpeed has a `tap-targets` audit to pull from).
- ☐ Competitor blurb in reports (PRD v1.5).

## 8. Repo / build hygiene

- ☐ Monorepo now needs **Node 20** for the web build; root `pnpm -r build` fails on the machine's default 18.16. Decide whether to bump the whole repo to Node 20.
- ☐ Two `.env` files (`localbiz/.env` + `sitevitals/.env`) with overlapping keys and a load-order gotcha — consolidate to avoid surprises (this already bit us once with `REPORT_FROM_EMAIL`).
- ☐ `ioredis` pinned to `5.10.1` to match BullMQ's bundled copy — keep in lockstep when upgrading BullMQ.
- ☐ (Optional) Replace hand-maintained `packages/worker/src/db/types.ts` with generated types via `supabase gen types` once the project is linked.

## 9. Launch readiness (PRD E6)

- ☐ Error monitoring (Sentry) live on both web + worker.
- ☐ Landing/marketing page production-ready.
- ☐ First 10-customer validation outreach (the manual `engine scan` + `engine report` concierge flow already works for this).
