-- Prospect Photos
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → paste and run).
-- Prerequisite: create a Storage bucket named `prospect-photos` (Public read).

CREATE TABLE IF NOT EXISTS prospect_photos (
  id                 SERIAL PRIMARY KEY,
  prospect_place_id  TEXT NOT NULL REFERENCES prospects(place_id) ON DELETE CASCADE,
  storage_key        TEXT NOT NULL,
  public_url         TEXT NOT NULL,
  file_name          TEXT,
  mime_type          TEXT,
  size_bytes         INTEGER,
  caption            TEXT,
  sort_order         INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_photos_prospect ON prospect_photos(prospect_place_id);
