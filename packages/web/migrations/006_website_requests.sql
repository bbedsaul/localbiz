-- W1 Stage B: inbound "Request my website" leads (concierge, not self-serve).
-- Written by the public marketing form via the service-role client; read by you
-- in the admin console. RLS denies anon reads (admin-only select).
create table if not exists website_requests (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  what_you_do text,
  city text,
  contact text not null,          -- email or phone
  current_site text,
  body text,
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  created_at timestamptz not null default now()
);

alter table website_requests enable row level security;
-- Only admins can read/manage; inserts happen via the service-role client (bypasses RLS).
create policy website_requests_admin_all on website_requests for all using (is_admin());
