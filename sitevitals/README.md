# SiteVitals

Website health monitor for local businesses: runs technical checks against a
site, scores them into category grades, and (eventually) emails owners a
plain-English monthly report card.

## Workspace layout

| Package              | Status      | Purpose                                            |
| -------------------- | ----------- | -------------------------------------------------- |
| `@sitevitals/engine` | implemented | All check logic + scoring, runnable as a CLI       |
| `@sitevitals/worker` | placeholder | Schedulers, queues, alerting (BullMQ + Redis)      |
| `@sitevitals/web`    | placeholder | Next.js dashboard                                  |

## Quick start

```sh
pnpm install
pnpm engine scan https://example.com --json out.json
pnpm engine scan example.com --category "HVAC" --city "Austin"
pnpm test
pnpm lint
```

## Engine checks

- `uptime` — GET with 10s timeout; status code, response time, redirect chain
- `ssl` — TLS handshake; issuer, expiry, days remaining
- `domain` — RDAP expiry lookup (reports `supported: false` for TLDs without RDAP)
- `crawl` — homepage + up to 50 internal pages; broken links, title/meta issues,
  alt text, sitemap/robots/favicon, viewport meta
- `pagespeed` — PageSpeed Insights, mobile + desktop (needs `PAGESPEED_API_KEY`)
- `safebrowsing` — Google Safe Browsing v4 (needs `SAFE_BROWSING_API_KEY`)
- `httpsEnforced` — http→https redirect + homepage mixed content

`GOOGLE_API_KEY` works as a fallback for both Google APIs. Checks missing a key
are reported as `skipped`, never as failures. A scan never throws — every check
failure is captured in the `ScanResult` JSON (`status: 'error'`).

## Scoring

Category weights follow the product spec (uptime 25%, performance 15%, mobile
10%, local search 20%, listings 15%, hygiene 10%, security 5%). The engine CLI
does not measure local search or listings yet; unmeasured categories are
renormalized out of the composite rather than counted as zero. Grades:
A ≥90, B ≥80, C ≥70, D ≥60, F <60.
