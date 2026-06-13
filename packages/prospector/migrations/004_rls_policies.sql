-- RLS Policies for Dashboard Tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → paste and run)

-- Option 1: Disable RLS (simpler, if only backend accesses these tables)
ALTER TABLE scheduled_searches DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_builds DISABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_queue DISABLE ROW LEVEL SECURITY;

-- OR Option 2: Enable RLS with permissive policies (if you need RLS)
-- Uncomment below and comment out the DISABLE statements above:

-- ALTER TABLE scheduled_searches ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for service role" ON scheduled_searches
--   FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE site_builds ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for service role" ON site_builds
--   FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE outreach_queue ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for service role" ON outreach_queue
--   FOR ALL USING (true) WITH CHECK (true);
