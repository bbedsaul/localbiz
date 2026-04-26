-- Dashboard Tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → paste and run)

-- Scheduled searches table
CREATE TABLE IF NOT EXISTS scheduled_searches (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  schedule TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_run TIMESTAMPTZ,
  found_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site builds table
CREATE TABLE IF NOT EXISTS site_builds (
  id SERIAL PRIMARY KEY,
  prospect_id TEXT REFERENCES prospects(place_id),
  template TEXT NOT NULL,
  domain TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scheduled_searches_status ON scheduled_searches(status);
CREATE INDEX IF NOT EXISTS idx_site_builds_status ON site_builds(status);
CREATE INDEX IF NOT EXISTS idx_site_builds_prospect_id ON site_builds(prospect_id);
