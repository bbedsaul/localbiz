# PRD: Website Health Monitor for Local Businesses

**Working name:** SiteVitals (placeholder)
**Version:** 0.1 (Draft)
**Owner:** Bill
**Last updated:** June 2026
**Related products:** Prospector (lead pipeline / site generation) — shared prospect base, shared Supabase infrastructure

## 1. Overview

### 1.1 Problem

Local business owners have no idea whether their website and online listings are actually working for them. Their site may be down, slow, broken on mobile, invisible in local search, or showing wrong hours across Google/Yelp/Facebook — and they won't know until a customer tells them (or never). Agencies charge $100–500/month for "maintenance" that's mostly opaque. There is no cheap, plain-English, set-and-forget monitor built for non-technical owners.

### 1.2 Solution

A fully automated monitoring service that checks a business's website and online presence continuously, then delivers a plain-English monthly report card by email (with optional instant alerts for critical issues like downtime). No dashboard required to get value — the email is the product. A simple web dashboard exists for detail and settings.

### 1.3 Why now / why us

- Near-zero marginal cost to run; ideal solo-founder economics.
- Direct synergy with Prospector: every generated website gets monitoring attached; every monitoring report is a marketing channel for upsells ("your competitor outranks you — want us to fix that?").
- Differentiator vs. uptime-monitor commodities (UptimeRobot, Pingdom): those are built for developers. This is built for the dentist.

### 1.4 Goals

- **G1:** Owner understands their web health in <60 seconds/month with zero logins.
- **G2:** <$1.50/month infrastructure cost per customer at scale.
- **G3:** Monitoring reports generate qualified upsell leads for higher-ticket services.
- **G4:** First 10 paying customers within 60 days of launch.

### 1.5 Non-goals (v1)

- Fixing issues automatically (report only; fixes are the upsell).
- Full SEO suite / keyword research tooling.
- Social media monitoring.
- White-label/agency multi-tenant features (v2 candidate).

## 2. Target Users & Personas

**P1 — "Owner Olivia" (primary buyer).** Owns an HVAC company / dental office / salon. Has a website (maybe built by a nephew in 2019). Checks email daily, never logs into dashboards. Wants: "Is my website OK? Am I losing customers? Tell me in English."

**P2 — "Agency-of-one Andy" (secondary, v1.5).** Freelancer/agency managing 5–30 client sites. Wants a branded report he can forward to clients. (Drives multi-site pricing tier.)

**P3 — Bill-as-operator.** Internal persona: monitoring data feeds the Prospector pipeline (sites in bad shape = warm leads).

## 3. Core Product: The Checks

### 3.1 Check categories

| #  | Category                    | Checks                                                                                                             | Frequency                          |
| -- | --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| C1 | Uptime & availability       | HTTP status, response time, SSL cert validity/expiry, domain expiry (WHOIS)                                         | 5 min (uptime), daily (SSL/domain) |
| C2 | Performance                 | Lighthouse performance score, LCP/CLS/INP (Core Web Vitals), page weight                                            | Weekly                             |
| C3 | Mobile friendliness         | Viewport config, tap target sizing, mobile Lighthouse score                                                         | Weekly                             |
| C4 | Local search visibility     | Google ranking position for "{service} {city}" (3–5 tracked keywords), Google Business Profile presence, map pack presence | Weekly                       |
| C5 | Listing consistency (NAP)   | Name/Address/Phone/hours consistency across Google Business Profile, Yelp, Facebook                                 | Weekly                             |
| C6 | Content & technical hygiene | Broken links, missing meta titles/descriptions, missing alt text, sitemap/robots.txt present, favicon               | Weekly                             |
| C7 | Security & trust            | HTTPS enforced, mixed content, blacklist check (Google Safe Browsing)                                                | Daily                              |

### 3.2 Scoring model

- Each category scores 0–100; weighted composite = overall Health Score (A–F letter grade for the email).
- Suggested v1 weights: C1 25%, C4 20%, C2 15%, C5 15%, C3 10%, C6 10%, C7 5%.
- Score history retained for trend lines ("up 12 points since last month").

### 3.3 AI layer (Claude)

- **Report narration:** converts raw check results into a plain-English summary at an 8th-grade reading level. Tone: helpful neighbor, not auditor. Always leads with what's good before issues.
- **Prioritization:** ranks issues by estimated business impact ("Your site was down for 3 hours Tuesday — roughly 14 missed visitors" beats "missing alt text on 6 images").
- **Competitor blurb (v1.5):** one paragraph comparing health score vs. 1–2 named local competitors.
- **Strict structure:** AI fills a fixed template; numbers come from checks, never the model (no hallucinated stats).

## 4. Key Flows

### 4.1 Onboarding (target: <3 minutes)

1. Enter website URL + business category + city.
2. System auto-discovers Google Business Profile, Yelp, Facebook pages (owner confirms matches).
3. System suggests 3–5 local keywords from category + city (owner can edit).
4. Instant "first scan" runs while they watch → immediate aha-moment report on screen.
5. Email + payment (14-day trial, card required — see pricing).

### 4.2 Monthly report email (the core artifact)

- Subject: "Your June Website Report Card: B+ (up from B)"
- Sections: Grade + trend → 3 wins → top 3 issues in plain English with impact → one recommended action → footer CTA ("Want this fixed? Reply to this email.")
- Single-column, mobile-first HTML email. No login required to read everything.

### 4.3 Critical alerts (instant)

Site down >10 min, SSL expired/expiring <7 days, domain expiring <14 days, blacklist hit. Email + optional SMS (Twilio). Throttled/deduplicated.

### 4.4 Dashboard (minimal v1)

Health score + trend chart, check details per category, settings (keywords, contacts, alert prefs), billing portal (Stripe).

## 5. Technical Architecture

### 5.1 Stack (aligned with Prospector for reuse)

- **Backend:** Node.js / TypeScript
- **Jobs/scheduling:** node-cron or BullMQ + Redis (Upstash) for check queues; uptime checks via a lightweight always-on worker (Fly.io/Railway) or Cloudflare Workers cron
- **DB:** Supabase (Postgres) — businesses, checks, results, scores, report archive
- **Frontend:** Next.js (App Router) + Tailwind, deployed on Vercel
- **Auth:** Supabase Auth (magic link — owners hate passwords)
- **Payments:** Stripe (subscriptions + customer portal)
- **Email:** Resend or Postmark (transactional + report delivery)
- **SMS:** Twilio (alerts only)
- **AI:** Claude API (report narration, prioritization)

### 5.2 External APIs & data sources

| Need                  | Source                              | Notes / cost                                                              |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| Lighthouse / CWV      | Google PageSpeed Insights API       | Free, quota-limited; queue + cache                                         |
| Local rankings        | SerpAPI / DataForSEO / ValueSERP    | Biggest per-unit cost (~$0.002–0.01/query); weekly cadence keeps it cheap |
| Google Business Profile | Places API (public data)          | Free tier generous for read-only lookups                                   |
| Yelp                  | Yelp Fusion API                     | Free tier                                                                  |
| Facebook page data    | Graph API (public page fields)      | Rate-limit care                                                            |
| Safe Browsing         | Google Safe Browsing API            | Free                                                                       |
| WHOIS / domain expiry | WhoisXML or RDAP                    | Cheap/free                                                                 |
| SSL                   | Direct TLS handshake check          | Free (own code)                                                            |
| Broken links / meta   | Own crawler (got/cheerio or Playwright) | Cap pages crawled (e.g., 50)                                           |

### 5.3 Cost model per customer (monthly, estimated)

- SERP queries: 5 keywords × 4 weeks ≈ 20 queries ≈ $0.05–0.20
- PageSpeed/crawl compute: ~$0.10
- Claude narration: 1 report + alert snippets ≈ $0.05–0.15
- Email/SMS: ~$0.05 (SMS only on alerts)
- **Total: well under $1/customer/month → 95%+ gross margin at $29.**

### 5.4 Data model (core tables)

- `businesses` (id, name, url, category, city, gbp_id, yelp_id, fb_id, plan, owner_user_id)
- `keywords` (business_id, phrase, is_auto)
- `checks` (business_id, type, schedule, config)
- `check_results` (check_id, ran_at, status, raw jsonb, score)
- `scores` (business_id, period, category_scores jsonb, composite, grade)
- `reports` (business_id, period, html, sent_at, opened_at, clicked_at)
- `alerts` (business_id, type, triggered_at, resolved_at, notified_via)

### 5.5 Key engineering risks

- **SERP scraping/API reliability & cost** — abstract behind a provider interface; start with one vendor, keep a fallback.
- **PageSpeed API quotas** — queue with backoff; cache aggressively; stagger customer scans across the week.
- **Listing auto-discovery accuracy** — fuzzy match name+city+phone; always confirm with owner in onboarding.
- **Email deliverability** — dedicated sending domain, warm-up, DMARC/SPF/DKIM from day one; the report email IS the product, so this is P0.

## 6. Pricing & Packaging

| Tier         | Price  | Includes                                                       |
| ------------ | ------ | -------------------------------------------------------------- |
| Solo         | $29/mo | 1 site, monthly report, critical alerts (email)                 |
| Pro          | $49/mo | 1 site + SMS alerts + weekly mini-report + competitor blurb     |
| Multi (v1.5) | $99/mo | Up to 5 sites, forwardable branded reports                      |

- 14-day trial, card required (filters tire-kickers; instant first scan delivers value before paywall).
- Annual = 2 months free.
- Prospector bundle: included free for 3 months with every Prospector-built site, then $29/mo — built-in distribution + churn-resistant base.

## 7. Success Metrics

| Metric                                       | Target (90 days post-launch) |
| -------------------------------------------- | ----------------------------- |
| Paying customers                             | 25                            |
| Trial → paid conversion                      | ≥40%                          |
| Monthly report open rate                     | ≥60%                          |
| Monthly churn                                | ≤5%                           |
| Infra cost per customer                      | ≤$1.50/mo                     |
| Upsell leads generated (report CTA replies)  | ≥5/mo                         |

## 8. Build Plan (Epics)

- **E1 — Core check engine (Week 1–2):** Uptime worker, SSL/domain checks, PageSpeed integration, crawler (links/meta/mobile), scoring model, results storage.
- **E2 — Local visibility & listings (Week 2–3):** SERP provider integration, GBP/Yelp/FB discovery + NAP comparison, keyword suggestion logic.
- **E3 — Report generation & delivery (Week 3):** Claude narration pipeline (fixed template, structured JSON in → HTML out), email rendering, Resend integration, report archive, open/click tracking.
- **E4 — Alerts (Week 3–4):** Threshold rules, dedupe/throttle, email + Twilio SMS, resolution detection.
- **E5 — Onboarding & dashboard (Week 4–5):** 3-minute onboarding flow with instant first scan, minimal dashboard, Supabase Auth magic links.
- **E6 — Billing & launch hardening (Week 5–6):** Stripe subscriptions + portal, plan gating, deliverability setup (domain warm-up, DMARC/SPF/DKIM), error monitoring (Sentry), landing page.

Total: ~6 weeks part-time, faster with Claude Code doing the scaffolding. Detailed task breakdown can be generated per epic when ready (Prospector-style multi-session prompts recommended).

## 9. v2 / Later

- Auto-fix integrations (one-click "fix my listings" via Yelp/GBP APIs)
- White-label agency tier
- Competitor tracking module (full)
- Accessibility (WCAG) checks
- Embeddable "Health Badge" for customer sites (viral loop)
- Lead-gen mode: scan-any-site free tool as top-of-funnel (shared with Prospector)

## 10. Open Questions

1. SERP data vendor choice — cost vs. accuracy bake-off needed (DataForSEO vs. SerpAPI vs. ValueSERP).
2. Card-required vs. no-card trial — test after first 25 customers.
3. Brand: standalone name vs. Prospector sub-brand?
4. Should the free "scan any site" tool launch with v1 as the acquisition engine, or after?
