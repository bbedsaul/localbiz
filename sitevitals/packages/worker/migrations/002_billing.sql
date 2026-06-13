-- Stripe billing linkage for businesses. Idempotent.
-- Apply in the Supabase SQL editor or: psql $DATABASE_URL -f migrations/002_billing.sql

alter table businesses
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists trial_ends_at timestamptz;

create index if not exists businesses_stripe_customer_idx
  on businesses (stripe_customer_id);
