Prospector — No-Website Lead Engine

Project purpose
Automated pipeline that finds small businesses on Google Maps with no website, scores them as sales leads, and queues them for outreach + site generation.

Stack
Runtime: Node.js 20+ (ESM, not CommonJS) Language: TypeScript (strict mode) Scheduler: node-cron
HTTP client: axios
Database: PostgreSQL via pg (node-postgres) Testing: Jest
Linting: ESLint + prettier

Project structure
  src/
    scheduler.ts      # cron job entry point
    prospector.ts     # core sweep pipeline
    places-client.ts  # Google Places API (New) wrapper
     db.ts
    scorer.ts
    queue.ts
    types.ts
  migrations/
    001_init.sql
  .env.example

Key conventions
# pg pool + query helpers
# lead scoring logic
# outreach queue promotion
# shared TypeScript interfaces
# prospects + outreach_queue tables
# required env vars template

Use ES modules: import/export , never require()
  
 All DB calls must be idempotent — upsert by place_id , never insert blindly Always check websiteUri field — if present, skip the record entirely Respect Places API rate limits: 2s sleep between paginated requests
Never commit secrets — use .env and process.env
Environment variables required
  GOOGLE_API_KEY=
  DATABASE_URL=postgresql://...
  CRON_SCHEDULE=0 2 * * *

Build and run commands
     npm run build
npm run dev
npm test
npm run lint
npm run migrate
# tsc compile
# ts-node-esm src/scheduler.ts
# jest
# eslint src/
# psql $DATABASE_URL -f migrations/001_init.sql

Testing approach
Unit test scorer.ts with mock place data
Integration test prospector.ts with a Places API sandbox response fixture Never call live Google API in tests — use fixtures in tests/fixtures/
What Claude gets wrong on this project
DO NOT use CommonJS require() — this is pure ESM
DO NOT use the legacy Places API (maps.googleapis.com/maps/api/place/) — use the NEW Places API (places.googleapis.com/v1/)
The new API uses X-Goog-FieldMask header, not a fields query param node-cronschedulestringis "02***" not "02****" (5fields,not6)
  