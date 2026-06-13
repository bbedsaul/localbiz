# sitevitals-worker — runbook

Always-on service that runs checks on schedule, persists results to Supabase,
fires alerts (email/SMS), and sends the monthly report email.

## Architecture

- **scheduler queue** — 4 repeatable ticks: `uptime-tick` (every 5 min),
  `daily-tick` (06:00 UTC), `weekly-tick` (03:00 UTC daily, but each business
  only scans on its hash-assigned weekday — spreads PageSpeed quota),
  `monthly-tick` (08:00 UTC on the 1st). Each tick fans out one job per
  active business with deterministic per-business jitter.
- **uptime queue** — lightweight HTTP + TLS check, persists results, evaluates
  `site_down` (2 consecutive failures ≈ down >10 min at 5-min cadence).
- **daily queue** — SSL/domain expiry + Safe Browsing, evaluates
  `ssl_expiring` (<7d), `domain_expiring` (<14d), `blacklisted`.
- **weekly-scan queue** — full engine `runScan`, persists every check row +
  a `full_scan` row (the report's input), upserts the period's `scores`.
- **monthly-report queue** — report pipeline → `reports` table → Resend.
- **HTTP** — `GET /healthz`, `POST /webhooks/resend` (open/click tracking,
  Svix-signature verified).

Alert lifecycle: one open alert per (business, type) — enforced by a partial
unique index; max 1 notification per 24h while unresolved; auto-resolves with
a recovery email when the condition clears.

## Environment variables

| Var | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) | ✅ | service role — bypasses RLS |
| `REDIS_URL` | ✅ | Upstash Redis `rediss://default:…@….upstash.io:6379` |
| `RESEND_API_KEY` | for email | alerts + reports |
| `REPORT_FROM_EMAIL` / `ALERT_FROM_EMAIL` | recommended | verified sender |
| `RESEND_WEBHOOK_SECRET` | recommended | `whsec_…` from the Resend webhook config |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | for SMS | pro-plan alerts |
| `ANTHROPIC_API_KEY` | for AI narration | reports fall back to template without it |
| `PAGESPEED_API_KEY`, `DATAFORSEO_LOGIN`/`PASSWORD`, `YELP_API_KEY`, … | per check | see engine `.env.example` |
| `SENTRY_DSN` | optional | error reporting |
| `EMAIL_OVERRIDE_TO` | staging | route ALL outbound mail to one address |
| `PORT` (8080), `LOG_LEVEL` (info) | optional | |

## First-time setup

1. **Database**: run `migrations/001_init.sql` in the Supabase SQL editor
   (or `psql $DATABASE_URL -f migrations/001_init.sql`). Idempotent.
2. **Types** (optional, recommended once the project is linked):
   `SUPABASE_PROJECT_ID=xxx pnpm gen:types`, then point `src/db/` at the
   generated `database.types.ts`.
3. **Redis**: create an Upstash Redis database, copy the `rediss://` URL.
4. **Resend webhook**: dashboard → Webhooks → add
   `https://<worker-host>/webhooks/resend` for `email.opened` +
   `email.clicked`; store the signing secret as `RESEND_WEBHOOK_SECRET`.

## Run locally

```sh
pnpm --filter sitevitals-engine build   # worker imports the built engine
pnpm --filter sitevitals-worker seed    # 3 test businesses (one always-down)
pnpm --filter sitevitals-worker dev     # starts ticks, workers, http server
```

## Acceptance scenario

1. `seed` creates 3 businesses; one points at a dead URL.
2. Start the worker. `uptime-tick` fires every 5 min; watch logs for
   `site_down alert state changed` — first failure is a blip (no alert),
   the second consecutive failure (≈10 min) opens the alert and emails the
   owner. Expected: alert email within ~12 min of startup.
3. Fix or repoint the dead URL (update the row's `url`), wait one tick —
   the alert auto-resolves and a recovery email goes out.
4. Monthly report end-to-end without waiting for the 1st:
   ```sh
   pnpm --filter sitevitals-worker trigger weekly-scan all      # produce full_scan + scores
   pnpm --filter sitevitals-worker trigger monthly-report all   # render + store + send
   ```
   Check the `reports` table for html/sent_at; open the email to see
   `opened_at` update via the webhook.

## Replaying failed jobs

Failed jobs stay in Redis 7 days (3 attempts, exponential backoff).
Re-enqueue manually with the trigger script:
`pnpm --filter sitevitals-worker trigger <queue> <businessId>`.
For bulk retries use Upstash console or Bull Board pointed at the same Redis.

## Deploy

- **Railway**: repo root as context; `railway.json` picks up the Dockerfile.
- **Fly**: `fly deploy --config packages/worker/fly.toml --dockerfile packages/worker/Dockerfile`
  from the monorepo root. Keep `min_machines_running = 1` — this service must
  not autosleep or uptime checks stop.

Set all env vars in the platform config. The container exposes `/healthz`.
