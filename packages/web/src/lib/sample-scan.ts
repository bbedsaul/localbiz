import type { ScanResult } from 'sitevitals-engine';

// A realistic ScanResult fixture for the SiteVitals marketing page's sample
// report. Rendered through the SAME prioritizeIssues() mapping the product uses.
const at = '2026-07-01T14:00:00.000Z';
const check = (raw: unknown) => ({
  type: 'x',
  status: raw ? 'ok' : 'skipped',
  ranAt: at,
  durationMs: 120,
  raw,
});

export const SAMPLE_SCAN = {
  engineVersion: 'sample',
  url: 'https://bloomfloral.example',
  city: 'Austin',
  category: 'florist',
  startedAt: at,
  finishedAt: at,
  durationMs: 4200,
  checks: {
    uptime: check({ up: true, statusCode: 200, responseTimeMs: 810, redirects: [], finalUrl: 'https://bloomfloral.example' }),
    ssl: check({ valid: true, daysRemaining: 21, issuer: "Let's Encrypt", subject: '', validFrom: '', validTo: '' }),
    domain: check({ supported: true, daysRemaining: 240, registrar: 'GoDaddy', expiresAt: '', domain: 'bloomfloral.example' }),
    crawl: check({
      pagesCrawled: 12,
      brokenLinks: [{ url: 'https://bloomfloral.example/old-specials', from: '/' }],
      missingTitles: [],
      duplicateTitles: [],
      missingMetaDescriptions: ['/contact'],
      duplicateMetaDescriptions: [],
      imagesMissingAlt: [
        { page: '/', src: 'hero.jpg' },
        { page: '/', src: 'shop.jpg' },
        { page: '/gallery', src: 'a.jpg' },
      ],
      totalImages: 22,
      hasSitemap: true,
      hasRobotsTxt: true,
      hasFavicon: true,
      hasViewportMeta: true,
    }),
    pagespeed: check(null),
    safebrowsing: check({ flagged: false, threats: [] }),
    httpsEnforced: check({ httpsSupported: true, httpRedirectsToHttps: true, finalUrl: '', mixedContentCount: 0, mixedContentSamples: [] }),
    localVisibility: check({
      provider: 'sample',
      location: 'Austin, TX',
      rankings: [
        { keyword: 'florist austin', position: null, mapPack: false, topCompetitors: ['Petal Pushers', 'Austin Blooms'] },
        { keyword: 'wedding flowers austin', position: 9, mapPack: false, topCompetitors: [] },
      ],
      inMapPack: false,
      serpCostUsd: 0,
    }),
    napConsistency: check({
      businessName: 'Bloom Floral',
      listings: [],
      comparedFields: [],
      mismatches: [
        {
          field: 'phone',
          sources: ['Google', 'Yelp'],
          values: ['(512) 555-1000', '(512) 555-1009'],
          message: 'Your phone number is different on Google and Yelp.',
        },
      ],
    }),
  },
  scores: {
    composite: 76,
    grade: 'C',
    categories: [
      { id: 'uptime', label: 'Uptime & availability', weight: 0.25, score: 98 },
      { id: 'performance', label: 'Performance', weight: 0.15, score: null },
      { id: 'mobile', label: 'Mobile friendliness', weight: 0.1, score: 82 },
      { id: 'localSearch', label: 'Local search visibility', weight: 0.2, score: 54 },
      { id: 'listings', label: 'Listing consistency', weight: 0.15, score: 60 },
      { id: 'hygiene', label: 'Content & technical hygiene', weight: 0.1, score: 80 },
      { id: 'security', label: 'Security & trust', weight: 0.05, score: 92 },
    ],
  },
} as unknown as ScanResult;
