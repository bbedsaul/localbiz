-- SiteVitals core schema (worker + web).
-- Apply via Supabase SQL editor or: supabase db push / psql $DATABASE_URL -f migrations/001_init.sql
--
-- RLS model: owners (authenticated users) get read access to their own rows,
-- scoped through businesses.owner_user_id. The worker uses the service-role
-- key, which bypasses RLS entirely — no explicit policies needed for it.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  category text,
  city text,
  gbp_id text,
  yelp_id text,
  fb_id text,
  plan text not null default 'solo' check (plan in ('solo', 'pro', 'multi')),
  owner_user_id uuid references auth.users (id) on delete set null,
  -- Operational columns beyond the PRD sketch:
  owner_email text,          -- report/alert recipient (owners may pre-date auth users)
  phone text,                -- SMS alerts (pro plan)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists keywords (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  phrase text not null,
  is_auto boolean not null default false,
  unique (business_id, phrase)
);

create table if not exists checks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  type text not null,
  schedule text not null,
  config jsonb not null default '{}'::jsonb,
  unique (business_id, type)
);

create table if not exists check_results (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references checks (id) on delete cascade,
  ran_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'error', 'skipped')),
  raw jsonb,
  score numeric
);
create index if not exists check_results_check_id_ran_at_idx
  on check_results (check_id, ran_at desc);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  period text not null, -- 'YYYY-MM'
  category_scores jsonb not null,
  composite numeric not null,
  grade text not null check (grade in ('A', 'B', 'C', 'D', 'F')),
  unique (business_id, period)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  period text not null,
  html text not null,
  resend_email_id text, -- webhook attribution (email.opened / email.clicked)
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  unique (business_id, period)
);
create index if not exists reports_resend_email_id_idx on reports (resend_email_id);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  type text not null check (type in ('site_down', 'ssl_expiring', 'domain_expiring', 'blacklisted')),
  message text not null default '',
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  notified_via text[] not null default '{}',
  last_notified_at timestamptz
);
-- Dedupe at the database level: at most one OPEN alert per (business, type).
create unique index if not exists alerts_one_open_per_type_idx
  on alerts (business_id, type) where resolved_at is null;
create index if not exists alerts_business_id_idx on alerts (business_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: owners read their own data; the worker's service-role
-- key bypasses RLS. Owner-facing writes (onboarding) are limited to
-- businesses + keywords; everything else is worker-written.

alter table businesses enable row level security;
alter table keywords enable row level security;
alter table checks enable row level security;
alter table check_results enable row level security;
alter table scores enable row level security;
alter table reports enable row level security;
alter table alerts enable row level security;

create policy businesses_owner_select on businesses
  for select using (owner_user_id = auth.uid());
create policy businesses_owner_insert on businesses
  for insert with check (owner_user_id = auth.uid());
create policy businesses_owner_update on businesses
  for update using (owner_user_id = auth.uid());

create policy keywords_owner_select on keywords
  for select using (exists (
    select 1 from businesses b where b.id = keywords.business_id and b.owner_user_id = auth.uid()
  ));
create policy keywords_owner_write on keywords
  for all using (exists (
    select 1 from businesses b where b.id = keywords.business_id and b.owner_user_id = auth.uid()
  ));

create policy checks_owner_select on checks
  for select using (exists (
    select 1 from businesses b where b.id = checks.business_id and b.owner_user_id = auth.uid()
  ));

create policy check_results_owner_select on check_results
  for select using (exists (
    select 1 from checks c join businesses b on b.id = c.business_id
    where c.id = check_results.check_id and b.owner_user_id = auth.uid()
  ));

create policy scores_owner_select on scores
  for select using (exists (
    select 1 from businesses b where b.id = scores.business_id and b.owner_user_id = auth.uid()
  ));

create policy reports_owner_select on reports
  for select using (exists (
    select 1 from businesses b where b.id = reports.business_id and b.owner_user_id = auth.uid()
  ));

create policy alerts_owner_select on alerts
  for select using (exists (
    select 1 from businesses b where b.id = alerts.business_id and b.owner_user_id = auth.uid()
  ));
