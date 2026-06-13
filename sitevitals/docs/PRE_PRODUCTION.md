# SiteVitals — Pre-Production Checklist

Living list of everything still needed before onboarding real, paying customers.
Updated as work lands. Each open item is tracked as a
[GitHub issue](https://github.com/bbedsaul/localbiz/issues) (number linked inline).
**Last updated: 2026-06-13.**

Status legend: ☐ todo · ◑ partial / in progress · ☑ done (kept here for context)

---

## 0. Where we are today

- ☑ **Engine** (`packages/engine`) — all C1–C7 checks, scoring, report pipeline, CLI. 93 tests.
- ☑ **Worker** (`packages/worker`) — scheduling, persistence, alerts, monthly reports. **Deployed & live on Fly** (`sitevitals-worker.fly.dev`), health check passing.
- ☑ **Web** (`packages/web`) — landing, onboarding, dashboard. Builds clean; runs locally. **Not yet deployed.**
- ☑ Supabase migrations `001` + `002` applied. Test data cleaned out (DB is empty).

---

## 1. P0 — Email deliverability (PRD calls this P0; the report email IS the product)

- ☐ Verify a sending domain in Resend (ideally a dedicated subdomain, e.g. `mail.localmarketz.com`). [#1](https://github.com/bbedsaul/localbiz/issues/1)
- ☐ Add DKIM / SPF / DMARC DNS records from day one. [#2](https://github.com/bbedsaul/localbiz/issues/2)
- ☐ Update sender everywhere to the verified domain (worker Fly secret + `sitevitals/.env`). [#3](https://github.com/bbedsaul/localbiz/issues/3)
- ☐ Warm up the sending domain before volume. [#4](https://github.com/bbedsaul/localbiz/issues/4)
- ⚠️ Until done: all report/alert email only reaches `bbedsaul@gmail.com` (the Resend account email).

## 2. P0 — Deploy the web app (Vercel)

- ☐ Deploy `packages/web` to Vercel (root dir = repo root; build engine then web). [#5](https://github.com/bbedsaul/localbiz/issues/5)
- ☐ Set web env vars on Vercel (Supabase URL/anon/service-role, `NEXT_PUBLIC_APP_URL`, Stripe). [#6](https://github.com/bbedsaul/localbiz/issues/6)
- ☐ Supabase Auth config: add `/auth/callback` to the redirect allowlist; set Site URL. [#7](https://github.com/bbedsaul/localbiz/issues/7)
- ☐ Confirm the Node 20 runtime (Next 14 needs ≥18.17; Vercel defaults to 20). [#32](https://github.com/bbedsaul/localbiz/issues/32)

## 3. Stripe / billing (code complete — account side outstanding)

- ☑ `STRIPE_SECRET_KEY` — **test** key set & verified working. [#8](https://github.com/bbedsaul/localbiz/issues/8) (swap to a live key at go-live).
- ☑ `setup:stripe` → Solo $29 / Pro $49 **test** prices created, wired into web `.env.local`. [#9](https://github.com/bbedsaul/localbiz/issues/9) (re-run with `--live` at go-live).
- ◑ Stripe webhook — verified locally via Stripe CLI (signature OK, business row updated). Production webhook on the Vercel URL still to create after deploy. [#10](https://github.com/bbedsaul/localbiz/issues/10)
- ◑ End-to-end: checkout-session creation ✓ and webhook → DB write ✓ (test mode, against live DB). Browser card-payment click on the hosted page remains. [#11](https://github.com/bbedsaul/localbiz/issues/11)
- ☑ Migration `002` (Stripe columns) applied; checkout action, webhook sync, portal all built.

## 4. Check API keys (most checks are skipped without these)

- ☐ `PAGESPEED_API_KEY` — C2 performance + C3 mobile (current `GOOGLE_API_KEY` 403s for PageSpeed). [#12](https://github.com/bbedsaul/localbiz/issues/12)
- ☐ SERP provider for C4: `DATAFORSEO_LOGIN`/`PASSWORD` (or `SERP_PROVIDER=serpapi` + `SERPAPI_KEY`). [#13](https://github.com/bbedsaul/localbiz/issues/13)
- ☐ `GOOGLE_PLACES_API_KEY` — C5 Google listing. [#14](https://github.com/bbedsaul/localbiz/issues/14)
- ☐ `YELP_API_KEY` — C5 Yelp listing. [#15](https://github.com/bbedsaul/localbiz/issues/15)
- ☐ `FACEBOOK_ACCESS_TOKEN` — C5 Facebook (optional; degrades gracefully). [#16](https://github.com/bbedsaul/localbiz/issues/16)
- ☐ Enable Safe Browsing API on the Google key — C7. [#17](https://github.com/bbedsaul/localbiz/issues/17)
- ☐ `ANTHROPIC_API_KEY` on the worker — AI report narration (currently template fallback). [#18](https://github.com/bbedsaul/localbiz/issues/18)

## 5. Worker ops hardening

- ☐ Upstash eviction policy → `noeviction` (currently `optimistic-volatile`; BullMQ warns). [#19](https://github.com/bbedsaul/localbiz/issues/19)
- ☐ Point the Resend webhook at the worker (`email.opened`/`email.clicked`) + `RESEND_WEBHOOK_SECRET`. [#20](https://github.com/bbedsaul/localbiz/issues/20)
- ☐ Set `SENTRY_DSN` on the worker (wired, currently unset). [#36](https://github.com/bbedsaul/localbiz/issues/36)
- ☐ Keep the single always-on machine up; never scale to 2 (would double-fire schedulers). [#21](https://github.com/bbedsaul/localbiz/issues/21)
- ☐ Decide `ALERT_FROM_EMAIL` vs `REPORT_FROM_EMAIL` split. [#22](https://github.com/bbedsaul/localbiz/issues/22)

## 6. Web — gaps & follow-ups

- ☐ Full onboarding → paid-trial run in <3 min against the live worker (E5 acceptance). [#23](https://github.com/bbedsaul/localbiz/issues/23)
- ☐ Mobile-device QA pass (owners onboard from phones). [#24](https://github.com/bbedsaul/localbiz/issues/24)
- ☐ Rate-limit / abuse-protect the public unauthenticated `/api/scan`. [#25](https://github.com/bbedsaul/localbiz/issues/25)
- ☐ Sentry on the web app. [#36](https://github.com/bbedsaul/localbiz/issues/36)
- ☐ Multi-site support (the `multi` plan): onboarding + dashboard assume one business. [#26](https://github.com/bbedsaul/localbiz/issues/26)
- ☐ Landing page: real copy, an actual product screenshot, legal/footer links. [#27](https://github.com/bbedsaul/localbiz/issues/27)
- ☐ "Scan any site" free standalone tool — PRD open question. [#28](https://github.com/bbedsaul/localbiz/issues/28)
- ☐ No automated tests in `packages/web` yet. [#29](https://github.com/bbedsaul/localbiz/issues/29)

## 7. Engine — deferred check work

- ☐ C3 tap-target sizing (currently viewport + mobile Lighthouse only). [#30](https://github.com/bbedsaul/localbiz/issues/30)
- ☐ Competitor blurb in reports (PRD v1.5). [#31](https://github.com/bbedsaul/localbiz/issues/31)

## 8. Repo / build hygiene

- ☐ Bump the monorepo to **Node 20** (root `pnpm -r build` fails on the default 18.16). [#32](https://github.com/bbedsaul/localbiz/issues/32)
- ☐ Consolidate the two `.env` files (load-order gotcha — already bit us on `REPORT_FROM_EMAIL`). [#33](https://github.com/bbedsaul/localbiz/issues/33)
- ☐ Replace hand-maintained `packages/worker/src/db/types.ts` with `supabase gen types`. [#34](https://github.com/bbedsaul/localbiz/issues/34)
- ☐ Keep `ioredis` pinned to `5.10.1` in lockstep with BullMQ. [#35](https://github.com/bbedsaul/localbiz/issues/35)

## 9. Launch readiness (PRD E6)

- ☐ Error monitoring (Sentry) live on both web + worker. [#36](https://github.com/bbedsaul/localbiz/issues/36)
- ☐ Landing/marketing page production-ready. [#27](https://github.com/bbedsaul/localbiz/issues/27)
- ☐ First 10-customer validation outreach (concierge `engine scan` + `engine report`). [#37](https://github.com/bbedsaul/localbiz/issues/37)
