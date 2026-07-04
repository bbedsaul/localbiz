-- W3 Stage B: website concierge change requests.
-- Customers file free-text change requests (+ optional attachment); you update
-- status from the admin console.
create table if not exists change_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  body text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  attached_file_key text,                 -- Supabase Storage key (bucket: change-request-attachments)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists change_requests_business_idx on change_requests (business_id, created_at desc);

alter table change_requests enable row level security;

-- Owner sees/creates rows for their own business; admin sees all + updates status.
create policy change_requests_owner_select on change_requests
  for select using (
    exists (select 1 from businesses b where b.id = change_requests.business_id and b.owner_user_id = auth.uid())
    or is_admin()
  );
create policy change_requests_owner_insert on change_requests
  for insert with check (
    exists (select 1 from businesses b where b.id = change_requests.business_id and b.owner_user_id = auth.uid())
  );
create policy change_requests_admin_update on change_requests
  for update using (is_admin());
