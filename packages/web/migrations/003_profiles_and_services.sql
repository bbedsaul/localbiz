-- W2: accounts + entitlements model.
-- Adds the platform `services` jsonb (source of truth for entitlements), a
-- `profiles` table for role routing, and admin RLS bypass via policy.

-- 1) Entitlements live in businesses.services jsonb, keyed by service:
--    { "sitevitals": { status, plan, stripe_subscription_id, current_period_end } }
-- The Stripe webhook is the ONLY writer (it also keeps legacy active/
-- subscription_status/plan in sync so the existing worker is untouched).
alter table businesses add column if not exists services jsonb not null default '{}'::jsonb;

-- 2) profiles: one row per auth user. role routes admin↔customer; business_id
-- links a customer to their business.
create table if not exists profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  business_id uuid references businesses (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3) is_admin(): SECURITY DEFINER so it runs as the table owner (postgres, which
-- bypasses RLS) — this avoids recursion when referenced inside profiles' own RLS
-- policies. Fixed search_path for safety.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where user_id = auth.uid() and role = 'admin'
  );
$$;

-- 4) RLS on profiles: a user sees/writes only their own row; admins can read all.
alter table profiles enable row level security;

create policy profiles_self_select on profiles
  for select using (user_id = auth.uid() or is_admin());
create policy profiles_self_write on profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 5) Admin bypass on businesses + children. Postgres combines multiple
-- permissive policies with OR, so ADDING an admin-all policy grants admins
-- access on top of the existing owner policies — no need to drop/rewrite them.
create policy businesses_admin_all on businesses for all using (is_admin());
create policy keywords_admin_all on keywords for all using (is_admin());
create policy checks_admin_all on checks for all using (is_admin());
create policy check_results_admin_all on check_results for all using (is_admin());
create policy scores_admin_all on scores for all using (is_admin());
create policy reports_admin_all on reports for all using (is_admin());
create policy alerts_admin_all on alerts for all using (is_admin());
