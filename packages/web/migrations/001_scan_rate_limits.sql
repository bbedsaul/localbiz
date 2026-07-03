-- Free instant-scanner rate limiting: 3 scans per IP per day.
-- Keyed by a salted hash of the client IP (never store raw IPs) + calendar day.
-- Written by the web app's service-role client; not exposed to browsers.
create table if not exists scan_rate_limits (
  ip_hash text not null,
  day date not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (ip_hash, day)
);

-- Optional housekeeping: rows older than a few days are dead weight.
-- (Run manually or via a scheduled job.)
-- delete from scan_rate_limits where day < current_date - interval '7 days';
