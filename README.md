# SiteVitals

Website health monitor for local businesses: runs technical checks against a
site, scores them into category grades, and (eventually) emails owners a
plain-English monthly report card.

## Workspace layout

| Package              | Status      | Purpose                                            |
| -------------------- | ----------- | -------------------------------------------------- |
| `sitevitals-engine` | implemented | All check logic + scoring + report pipeline, runnable as a CLI |
| `sitevitals-worker` | implemented | Scheduled checks, Supabase persistence, alerts, monthly reports (BullMQ + Upstash) — see its README runbook |
| `web`    | implemented | Next.js App Router — landing, 3-min onboarding, dashboard |

## Planning & docs

- **[Validation plan](https://github.com/bbedsaul/localbiz/issues/48)** (epic #48) — the 30-day concierge GO/NO-GO before scaling the product. Start with the [Week 1 issues](https://github.com/bbedsaul/localbiz/labels/week-1).
- [Pre-production checklist](docs/PRE_PRODUCTION.md) — what's left before real customers (mirrors GitHub issues).
- [Decision log](DECISIONS.md) — non-obvious judgment calls and why.
- [PRD](docs/PRD.md) — the product spec.

## Quick start

```sh
pnpm install
pnpm engine scan https://example.com --json out.json
pnpm engine scan example.com --category "HVAC" --city "Austin"
pnpm engine report out.json --business "Joe's HVAC" --out report.html
pnpm engine report out.json --to owner@example.com --previous last-month.json
pnpm test
pnpm lint
```

`scan` + `report` together are the full concierge toolchain: scan a business,
generate the plain-English report-card email, and deliver it via Resend.
Narration uses the Claude API (`ANTHROPIC_API_KEY`) with a strict
numbers-come-from-the-scan contract — responses are zod-validated, retried
once, and replaced by a deterministic non-AI template if validation fails or
no key is set. Issues are ranked by a static business-impact map (downtime >
SSL expiry > not ranking > NAP mismatch > slow LCP > broken links > missing
meta > missing alt text).

## Engine checks

- `uptime` — GET with 10s timeout; status code, response time, redirect chain
- `ssl` — TLS handshake; issuer, expiry, days remaining
- `domain` — RDAP expiry lookup (reports `supported: false` for TLDs without RDAP)
- `crawl` — homepage + up to 50 internal pages; broken links, title/meta issues,
  alt text, sitemap/robots/favicon, viewport meta
- `pagespeed` — PageSpeed Insights, mobile + desktop (needs `PAGESPEED_API_KEY`)
- `safebrowsing` — Google Safe Browsing v4 (needs `SAFE_BROWSING_API_KEY`)
- `httpsEnforced` — http→https redirect + homepage mixed content
- `localVisibility` — organic position + map-pack presence per tracked keyword
  via a swappable SERP provider (`SERP_PROVIDER=dataforseo|serpapi`); top 3
  competitor domains recorded per keyword; vendor cost logged per scan
- `napConsistency` — finds the business on Google/Yelp/Facebook and compares
  name (fuzzy ≥0.85), phone (E.164), address, and hours; mismatches reported
  in plain English

Keywords come from `--keywords "a,b,c"`, or are auto-suggested from
`--category` + `--city` (curated map of ~20 local-business categories in
`src/keywords.ts`). See `.env.example` for the per-check API keys. Checks
missing a key are reported as `skipped`, never as failures. A scan never
throws — every check failure is captured in the `ScanResult` JSON
(`status: 'error'`).

## Scoring

Category weights follow the product spec (uptime 25%, performance 15%, mobile
10%, local search 20%, listings 15%, hygiene 10%, security 5%). Categories that
can't be measured on a given scan (e.g. local search / listings with no API
keys) are renormalized out of the composite rather than counted as zero.
Grades: A ≥90, B ≥80, C ≥70, D ≥60, F <60.
