-- Outreach Tracking Schema Extension
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → paste and run)

ALTER TABLE outreach_queue
  ADD COLUMN IF NOT EXISTS contact_method TEXT,
  ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response TEXT,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for outreach queries
CREATE INDEX IF NOT EXISTS idx_outreach_queue_response ON outreach_queue(response);
CREATE INDEX IF NOT EXISTS idx_outreach_queue_contacted_at ON outreach_queue(contacted_at);
