# SiteVitals — Decision Log

Judgment calls made while building SiteVitals — vendor choices, scoring tweaks,
architecture trade-offs — so later sessions inherit the context and don't
re-litigate or accidentally reverse them.

**How to use:** When you (Claude Code or a human) make a non-obvious call that a
future session would otherwise have to reverse-engineer, append an entry. Keep
it short: the decision, why, and the alternative you rejected. Newest at the
bottom. If a decision is later reversed, add a new entry that says so and
references the old one rather than deleting history.

Entry format:
```
### YYYY-MM-DD — Short title
**Decision:** what was decided.
**Why:** the reasoning.
**Alternative / notes:** what was rejected, or caveats. (optional)
```

---

### 2026-06-12 — SiteVitals lives in `sitevitals/` inside the Prospector repo
**Decision:** Build SiteVitals as a nested pnpm workspace under `sitevitals/` in the existing `localbiz` git repo, not a fresh repo.
**Why:** PRD calls for shared Supabase/prospect infrastructure with Prospector; a sibling directory avoids colliding with the root `package.json` while keeping one repo.
**Alternative / notes:** Could split into its own repo later. The git root (`localbiz/`) still holds the Prospector project + its `CLAUDE.md`.

### 2026-06-12 — Dependency majors pinned for Node 18.16
**Decision:** Pin engine/worker deps to Node 18.16-compatible majors (ESLint 8, typescript-eslint 6, cheerio 1.0.0-rc.12, Vitest 2).
**Why:** The dev machine runs Node 18.16; newer majors require ≥18.17/18.18.
**Alternative / notes:** `packages/web` (Next 14) forced Node 20 anyway — see 2026-06-13 Node entries. The repo is trending toward a full Node 20 bump (issue #32).

### 2026-06-12 — Composite score renormalizes unmeasured categories
**Decision:** The composite is a weighted average over *measured* categories only; categories that couldn't run (e.g. C4/C5 with no API keys) have their weight renormalized away, not counted as zero.
**Why:** A business shouldn't get an F because we lacked a SERP key. Grade reflects what was actually measured.
**Alternative / notes:** Counting unmeasured as 0 was rejected as punitive and misleading. An *unreachable site* (C1) still scores 0 — that's a real failure, not "unmeasured."

### 2026-06-12 — Domain expiry via RDAP, not WHOIS
**Decision:** Use RDAP for domain-expiry lookups; report `supported: false` gracefully for TLDs/registrars without RDAP.
**Why:** Free, no key, modern, structured JSON. PRD allowed "WhoisXML or RDAP."
**Alternative / notes:** WHOIS parsing is brittle and often rate-limited/paid.

### 2026-06-12 — `skipped` is distinct from `error`
**Decision:** Checks that can't run for lack of an API key return status `skipped`, never `error`.
**Why:** A missing key is an operator gap, not an unhealthy site. Scoring treats `skipped` as "unmeasured"; `error` (e.g. unreachable) can score 0.

### 2026-06-13 — DataForSEO is the default SERP provider
**Decision:** Implement DataForSeoProvider as the default behind the `SerpProvider` interface; SerpApiProvider is a stub. Selected via `SERP_PROVIDER`.
**Why:** Needed a concrete first vendor; DataForSEO has a clean live-SERP endpoint and per-query cost reporting.
**Alternative / notes:** Vendor bake-off (DataForSEO vs SerpAPI vs ValueSERP) is still a PRD open question — the interface keeps it swappable. Pass canonical location names (`"Austin,Texas,United States"`) for true local rankings; a bare city falls back to country-level.

### 2026-06-13 — NAP name matching strips legal suffixes before fuzzy compare
**Decision:** Before the Dice ≥0.85 fuzzy name match, strip legal suffixes (LLC, Inc, Co, …).
**Why:** "Joe's HVAC" vs "JOES HVAC LLC" scored 0.82 and was flagged as a different business — a false NAP mismatch. Suffix stripping fixes it.

### 2026-06-13 — Report narration guarded by a numbers-trace check + deterministic fallback
**Decision:** Claude narration uses a strict no-invented-numbers prompt AND a mechanical `numbersTrace` guard that rejects any multi-digit number in the output absent from the scan JSON. On failure: retry once, then fall back to a deterministic non-AI template.
**Why:** The PRD's hard rule is "AI never invents numbers." Prompt instructions alone aren't enforceable; the guard makes it provable, and the fallback guarantees an email always sends.
**Alternative / notes:** Default model `claude-opus-4-8` (override via `ANTHROPIC_MODEL`).

### 2026-06-13 — "Site down >10 min" = two consecutive failed uptime checks
**Decision:** Operationalize the downtime alert as 2 consecutive failures at the 5-min cadence (≈10 min), reading the previous persisted result before writing the current one.
**Why:** A single transient blip shouldn't page an owner. Two in a row ≈ a real outage.

### 2026-06-13 — One open alert per (business, type) enforced in the DB
**Decision:** A partial unique index (`where resolved_at is null`) enforces alert dedupe at the database level, not just in app code.
**Why:** Belt-and-suspenders against double-firing across concurrent worker jobs.

### 2026-06-13 — `businesses` gains owner_email / phone / active beyond the PRD sketch
**Decision:** Added `owner_email`, `phone`, `active` columns.
**Why:** Owners may pre-date an auth user (concierge onboarding), SMS alerts need a phone, and `active` gates whether the worker scans them.

### 2026-06-13 — Onboarding instant scan runs inline (SSE), full scan deferred to the worker
**Decision:** The free hero scan and onboarding "instant scan" run the no-API-key checks inline in a Node-runtime SSE route in the web app; PageSpeed/SERP/listings are deferred to the worker's full scan after signup.
**Why:** Keeps the aha-moment genuinely instant (a few seconds, no Redis round-trip) and within Vercel function limits, while the worker owns the slow/recurring full scans.
**Alternative / notes:** "Enqueue to the worker + poll" was rejected for onboarding — it adds a wait that undercuts the instant grade. The web tier stays decoupled from Redis.

### 2026-06-13 — Web data access: anon key + RLS; service role only in the Stripe webhook
**Decision:** All owner reads/writes go through the Supabase anon key with RLS (scoped by `owner_user_id = auth.uid()`). The service-role key is used only server-side in the Stripe webhook.
**Why:** RLS does isolation centrally; app code doesn't hand-check ownership. Minimizes blast radius of the service key.

### 2026-06-13 — Worker config loads the outer repo-root `.env`
**Decision:** The worker's config loader walks up to `localbiz/.env` (in addition to `sitevitals/.env` and the package `.env`).
**Why:** Shared keys (Supabase, Redis, Resend) already live in the repo-root `.env`; one file configures everything.
**Alternative / notes:** This created a two-`.env` load-order gotcha (bit us once on `REPORT_FROM_EMAIL`) — consolidation tracked in issue #33.

### 2026-06-13 — Supply `ws` as the supabase-js realtime transport
**Decision:** Pass the `ws` package as the realtime transport when constructing the Supabase client in the worker.
**Why:** supabase-js builds a realtime client at construction; Node <22 has no global `WebSocket`, so the worker crashed on startup. The worker never uses realtime — this just satisfies the constructor.

### 2026-06-13 — Fly image built via `pnpm deploy --prod --legacy`
**Decision:** The worker Dockerfile uses `pnpm deploy --prod --legacy` to produce a flattened, self-contained `node_modules`, with `packageManager: pnpm@10.28.0` pinned and `CI=true` for the prune.
**Why:** Hand-copying pnpm's symlinked `node_modules` between Docker stages broke module resolution (`Cannot find package @sentry/node`). corepack also defaulted to pnpm 11 (needs Node 22) on the Node 20 image. The deploy approach is clean and dropped the image 141MB → 50MB.

### 2026-06-13 — Deployed worker uses the Resend test sender for now
**Decision:** The live Fly worker has `REPORT_FROM_EMAIL=SiteVitals <onboarding@resend.dev>`.
**Why:** No sending domain is verified in Resend yet; the test sender works but only delivers to the Resend account's own email. Swap to a verified domain before real customers (issues #1–#3).

### 2026-06-13 — DECISIONS.md placed at the SiteVitals project root
**Decision:** This file lives at `sitevitals/DECISIONS.md`, not the git root.
**Why:** Every decision logged here is SiteVitals-specific; it belongs with the project's other top-level docs. "Repo root" was read as the project root.
**Alternative / notes:** Move to `localbiz/DECISIONS.md` if a single cross-project log is preferred.

### 2026-06-13 — prospector→sitevitals-engine is the one allowed cross-service edge
**Decision:** Prospector's `scan-prospects` flywheel imports `runScan` directly from `sitevitals-engine` (a `workspace:*` dep) — the single place a service package imports another service rather than only `@platform/core`.
**Why:** The engine is a pure library (no Supabase/Prospector imports), so the edge is safe and high-value: prospect scan grades become available for lead prioritization immediately. A `core` scan facade or calling the worker's HTTP endpoint would be cleaner but premature for one edge.
**Alternative / notes:** A second cross-service edge appearing is the signal to add a `core` facade instead.

### 2026-06-13 — scan-prospects schema is a nullable-column stopgap
**Decision:** `migrations/006_scan_results.sql` adds nullable `website_url` + `scan jsonb` to the existing `prospects` table rather than a new table.
**Why:** Prospector tracks website-LESS leads by design; the platform flywheel wants to scan websites — opposite populations. A dedicated `sites`/`scan_targets` table is the real fix but out of scope (Session 1 says no new tables). The nullable bolt-on satisfies the flywheel now.

### 2026-06-13 — Adopted the Prospector Platform monorepo
**Decision:** Converted the repo root to a pnpm workspace (`packages/{core, prospector, sitevitals-engine, sitevitals-worker, web}`). The original Prospector app moved unchanged to `packages/prospector`; the nested `sitevitals/` workspace was flattened; SiteVitals packages renamed `@sitevitals/* → sitevitals-*`. Services import only from `@platform/core` (one logged exception: prospector→sitevitals-engine).
**Why:** SiteVitals is one of several planned services (Missed-Call, Reviews, Social) on a shared `businesses` entity + `core` layer; a unified monorepo lets them slot in without restructuring.
**Alternative / notes:** Rollback tags `pre-platform-monorepo` (start) and `platform-monorepo-relocated` (after the structural move). `dashboard/` (standalone React/Vite app) is intentionally excluded from the workspace globs for now.

### 2026-06-13 — ScanResult contract in core; engine depends on core for types (Option A)
**Decision:** The `ScanResult` type-graph lives in `@platform/core/types`; `sitevitals-engine` imports and re-exports it. The engine thus depends on `@platform/core` (types only).
**Why:** Standard layering (services depend on core) and zero churn for the 18 worker/web import sites, which keep importing from the engine package. Chosen over keeping types in the engine (which would invert the dependency by having core re-export from a service).
**Alternative / notes:** "Pure library" still holds — the engine has no Supabase/Prospector/network deps, just shared type declarations.

### 2026-06-13 — core/db is the Supabase client only; service CRUD stays in services
**Decision:** `@platform/core/db` exports only the configured `supabase` client. Prospector's ~460 lines of table CRUD stay in `packages/prospector/src/db.ts`, importing the client from core.
**Why:** Keeps core dependency-light and domain-neutral; table-coupled queries belong to the owning service. Matches "extract ONLY the Supabase client + Places client."

### 2026-06-13 — Fly app name preserved across the worker rename
**Decision:** The worker package renamed to `sitevitals-worker` but the Fly app stays `sitevitals-worker`; only build paths + `pnpm --filter` names changed in the Dockerfile/fly.toml.
**Why:** Preserves the live DNS, secrets, and machine — the redeploy is a build-path change, not an app migration.
