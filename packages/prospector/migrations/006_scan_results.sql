-- SiteVitals flywheel (platform): store the latest website-health scan grade on
-- prospects that have a website, so lead prioritization can surface D/F sites.
-- Stopgap per DECISIONS.md — real per-service tables come in a later session.

alter table prospects add column if not exists website_url text;
alter table prospects add column if not exists scan jsonb; -- { composite, grade, scanned_at }

create index if not exists prospects_scan_grade_idx on prospects ((scan ->> 'grade'));
