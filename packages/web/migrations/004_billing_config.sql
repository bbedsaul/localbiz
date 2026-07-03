-- W2 Stage B: Stripe price config + webhook idempotency ledger.

-- Price IDs live in the DB (not just env) so the app + scripts share one source.
create table if not exists billing_prices (
  lookup_key text primary key,          -- e.g. sitevitals_solo_monthly
  stripe_price_id text not null,
  service text,                         -- 'sitevitals'
  plan text,                            -- 'solo' | 'pro'
  interval text,                        -- 'monthly' | 'annual'
  unit_amount integer,                  -- cents
  updated_at timestamptz not null default now()
);

-- Processed-event ledger: the webhook records each event id so replays /
-- duplicate deliveries are no-ops (Stripe delivers at-least-once).
create table if not exists stripe_events (
  id text primary key,                  -- Stripe event id (evt_…)
  type text,
  processed_at timestamptz not null default now()
);

-- Both are written only by the service-role client (webhook / setup script);
-- no RLS policies needed (RLS stays disabled, service role bypasses anyway).
