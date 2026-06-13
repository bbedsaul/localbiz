-- Prospector Phase 1 Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → paste and run)

CREATE TABLE IF NOT EXISTS prospects (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  rating NUMERIC,
  review_count INTEGER,
  photo_count INTEGER,
  score INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT DEFAULT 'maps',
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_queue (
  id SERIAL PRIMARY KEY,
  place_id TEXT REFERENCES prospects(place_id),
  queued_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_prospects_status_score ON prospects(status, score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_city_category ON prospects(city, category);
