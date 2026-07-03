-- Email capture for "coming soon" services (CallBack / Reviews / Social).
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  service text not null,
  created_at timestamptz not null default now(),
  unique (email, service)
);
