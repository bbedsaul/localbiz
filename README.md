# Prospector

No-Website Lead Engine — finds small businesses on Google Maps without websites, scores them as sales leads, and queues them for outreach and site generation.

## Features

- **Automated Prospecting**: Scheduled sweeps of Google Maps to find businesses without websites
- **Lead Scoring**: Automatic scoring based on ratings, reviews, and photos
- **Outreach Pipeline**: Track contact attempts and responses
- **Dashboard API**: REST API for the management dashboard
- **Interactive CLI**: Manual sweeps and pipeline management
- **Site Builds**: Queue and track website generation for prospects

## Stack

- **Runtime**: Node.js 20+ (ESM)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Supabase
- **Scheduler**: node-cron
- **HTTP Client**: axios
- **API Server**: Express
- **Testing**: Jest

## Project Structure

```
src/
  api.ts           # Express REST API server
  cli.ts           # Interactive CLI tool
  config.ts        # Configuration loader with validation
  db.ts            # Supabase database helpers
  places-client.ts # Google Places API (New) wrapper
  prospector.ts    # Core sweep pipeline
  queue.ts         # Outreach queue management
  scheduler.ts     # Cron job entry point
  scorer.ts        # Lead scoring logic
  types.ts         # TypeScript interfaces
config/
  targets.json          # Cities and categories to sweep (gitignored)
  targets.example.json  # Template for targets.json
migrations/
  001_init.sql              # Base schema
  002_outreach_tracking.sql # Outreach fields
  003_dashboard_tables.sql  # Scheduled searches, site builds
dashboard/                  # React dashboard (Vite)
```

## Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd localbiz
npm install
```

### 2. Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Google Cloud API key with Places API (New) enabled |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `CRON_SCHEDULE` | Cron expression for scheduled sweeps (default: `0 2 * * *`) |
| `API_PORT` | API server port (default: `3001`) |

### 3. Configure Targets

```bash
cp config/targets.example.json config/targets.json
```

Edit `config/targets.json` to set your target cities and business categories:

```json
{
  "cities": ["Akron OH", "Canton OH", "Dayton OH"],
  "categories": ["plumber", "auto repair", "HVAC"]
}
```

### 4. Database Setup

Run migrations in the Supabase SQL Editor:

```sql
-- Run each migration file in order:
-- migrations/001_init.sql
-- migrations/002_outreach_tracking.sql
-- migrations/003_dashboard_tables.sql
```

## Usage

### Run the Scheduler (Production)

```bash
npm run dev
```

Runs scheduled sweeps based on `CRON_SCHEDULE`. Set `NODE_ENV=development` to run immediately.

### Run the API Server

```bash
npm run api
```

Starts the Express API on port 3001 (or `API_PORT`).

### Interactive CLI

```bash
npm run cli
```

Menu options:
1. Run a manual sweep (prompt for city + category)
2. Show top 10 prospects by score
3. Show pipeline stats
4. Promote top prospects to outreach queue
5. Exit

### Run Tests

```bash
npm test
```

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/onboard` | Submit business onboarding form |

### Protected (requires Bearer token)

**Prospects**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prospects` | List prospects (filter by status, search) |
| GET | `/api/prospects/stats` | Prospect counts by status |
| PATCH | `/api/prospects/:id` | Update prospect status |

**Scheduled Searches**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/searches` | List scheduled searches |
| POST | `/api/searches` | Create new search |
| PATCH | `/api/searches/:id` | Update search status |
| DELETE | `/api/searches/:id` | Delete search |
| POST | `/api/searches/:id/run` | Trigger immediate sweep |

**Outreach**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/outreach/stats` | Outreach pipeline stats |
| POST | `/api/outreach/:id/contact` | Mark prospect contacted |
| POST | `/api/outreach/:id/response` | Record prospect response |

**Site Builds**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/builds` | List site builds |
| GET | `/api/builds/stats` | Build counts by status |
| POST | `/api/builds` | Create new build |
| PATCH | `/api/builds/:id` | Update build status |

**Forms**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forms` | List form submissions |
| GET | `/api/forms/stats` | Form submission stats |
| PATCH | `/api/forms/:id` | Approve/reject submission |

## Dashboard

The React dashboard is in the `dashboard/` directory:

```bash
cd dashboard
npm install
npm run dev
```

Runs on http://localhost:5173 (or next available port).

## Lead Scoring

Prospects are scored 0-100 based on:
- **Rating**: Higher Google ratings = higher score
- **Reviews**: More reviews = higher score
- **Photos**: Businesses with photos score higher

## License

ISC
