import { scoreScan } from '../../src/scoring.js';
import type { CheckResult, CheckType, ScanResult } from '../../src/types.js';

function ok<Raw>(type: CheckType, raw: Raw): CheckResult<Raw> {
  return { type, status: 'ok', ranAt: '2026-06-01T02:00:00.000Z', durationMs: 100, raw };
}

function errored(type: CheckType, error: string): CheckResult<never> {
  return { type, status: 'error', ranAt: '2026-06-01T02:00:00.000Z', durationMs: 100, raw: null, error };
}

function skipped(type: CheckType, error: string): CheckResult<never> {
  return { type, status: 'skipped', ranAt: '2026-06-01T02:00:00.000Z', durationMs: 0, raw: null, error };
}

function build(checks: ScanResult['checks'], composite?: number): ScanResult {
  const scores = scoreScan(checks);
  if (composite !== undefined) {
    scores.composite = composite;
  }
  return {
    engineVersion: '0.1.0',
    url: 'https://joes-hvac.com',
    category: 'HVAC',
    city: 'Austin',
    startedAt: '2026-06-01T02:00:00.000Z',
    finishedAt: '2026-06-01T02:00:45.000Z',
    durationMs: 45_000,
    checks,
    scores,
  };
}

/** A site in great shape: every category healthy, a couple of minor hygiene dings. */
export function healthyScan(): ScanResult {
  return build({
    uptime: ok('uptime', {
      finalUrl: 'https://joes-hvac.com/',
      statusCode: 200,
      responseTimeMs: 420,
      redirects: [],
      up: true,
    }),
    ssl: ok('ssl', {
      valid: true,
      issuer: "Let's Encrypt / R11",
      subject: 'joes-hvac.com',
      validFrom: '2026-04-01T00:00:00.000Z',
      validTo: '2026-08-15T00:00:00.000Z',
      daysRemaining: 75,
    }),
    domain: ok('domain', {
      supported: true,
      domain: 'joes-hvac.com',
      registrar: 'NameCheap',
      expiresAt: '2027-06-01T00:00:00.000Z',
      daysRemaining: 365,
    }),
    crawl: ok('crawl', {
      pagesCrawled: 12,
      brokenLinks: [],
      missingTitles: [],
      duplicateTitles: [],
      missingMetaDescriptions: [],
      duplicateMetaDescriptions: [],
      imagesMissingAlt: [
        { page: 'https://joes-hvac.com/team', src: '/img/crew.jpg' },
        { page: 'https://joes-hvac.com/team', src: '/img/van2.jpg' },
      ],
      totalImages: 24,
      hasSitemap: true,
      hasRobotsTxt: true,
      hasFavicon: true,
      hasViewportMeta: true,
    }),
    pagespeed: ok('pagespeed', {
      mobile: { performanceScore: 88, lcpMs: 2100, cls: 0.03, inpMs: 160, totalByteWeight: 1_100_000 },
      desktop: { performanceScore: 96, lcpMs: 1200, cls: 0.01, inpMs: 90, totalByteWeight: 1_000_000 },
    }),
    safebrowsing: ok('safebrowsing', { flagged: false, threats: [] }),
    httpsEnforced: ok('httpsEnforced', {
      httpsSupported: true,
      httpRedirectsToHttps: true,
      finalUrl: 'https://joes-hvac.com/',
      mixedContentCount: 0,
      mixedContentSamples: [],
    }),
    localVisibility: ok('localVisibility', {
      provider: 'dataforseo',
      location: 'Austin,Texas,United States',
      rankings: [
        { keyword: 'hvac repair austin', position: 2, mapPack: true, topCompetitors: ['coolbreezehvac.com'] },
        { keyword: 'ac repair austin', position: 6, mapPack: true, topCompetitors: ['coolbreezehvac.com'] },
        { keyword: 'furnace repair austin', position: 9, mapPack: false, topCompetitors: ['austinairpros.com'] },
      ],
      inMapPack: true,
      serpCostUsd: 0.006,
    }),
    napConsistency: ok('napConsistency', {
      businessName: "Joe's HVAC",
      listings: [
        { source: 'google', found: true, name: "Joe's HVAC", address: '123 Main St, Austin, TX', phone: '+15125551234', hours: null, rating: 4.8, reviewCount: 120, url: 'https://joes-hvac.com' },
        { source: 'yelp', found: true, name: 'Joes HVAC', address: '123 Main St, Austin, TX', phone: '+15125551234', hours: null, rating: 4.5, reviewCount: 40, url: 'https://yelp.com/biz/joes-hvac' },
        { source: 'facebook', found: true, name: "Joe's HVAC", address: '123 Main St, Austin, TX', phone: '+15125551234', hours: null, rating: 4.9, reviewCount: 25, url: 'https://facebook.com/joeshvac' },
      ],
      comparedFields: ['phone', 'address', 'name'],
      mismatches: [],
      foundCount: 3,
    }),
  });
}

/** A site in trouble: down, expiring cert, invisible in search, mismatched listings, slow, messy. */
export function brokenScan(): ScanResult {
  return build({
    uptime: ok('uptime', {
      finalUrl: 'https://joes-hvac.com/',
      statusCode: 503,
      responseTimeMs: 8200,
      redirects: [],
      up: false,
    }),
    ssl: ok('ssl', {
      valid: true,
      issuer: "Let's Encrypt / R11",
      subject: 'joes-hvac.com',
      validFrom: '2026-03-10T00:00:00.000Z',
      validTo: '2026-06-09T00:00:00.000Z',
      daysRemaining: 8,
    }),
    domain: ok('domain', {
      supported: true,
      domain: 'joes-hvac.com',
      registrar: 'NameCheap',
      expiresAt: '2027-06-01T00:00:00.000Z',
      daysRemaining: 365,
    }),
    crawl: ok('crawl', {
      pagesCrawled: 9,
      brokenLinks: [
        { url: 'https://joes-hvac.com/old-specials', foundOn: 'https://joes-hvac.com/', status: 404, reason: 'HTTP 404' },
        { url: 'https://joes-hvac.com/coupons', foundOn: 'https://joes-hvac.com/services', status: 404, reason: 'HTTP 404' },
      ],
      missingTitles: ['https://joes-hvac.com/services'],
      duplicateTitles: [],
      missingMetaDescriptions: ['https://joes-hvac.com/services', 'https://joes-hvac.com/about'],
      duplicateMetaDescriptions: [],
      imagesMissingAlt: Array.from({ length: 17 }, (_v, i) => ({
        page: 'https://joes-hvac.com/gallery',
        src: `/img/job-${i}.jpg`,
      })),
      totalImages: 31,
      hasSitemap: false,
      hasRobotsTxt: true,
      hasFavicon: true,
      hasViewportMeta: true,
    }),
    pagespeed: ok('pagespeed', {
      mobile: { performanceScore: 34, lcpMs: 6800, cls: 0.21, inpMs: 410, totalByteWeight: 5_400_000 },
      desktop: { performanceScore: 61, lcpMs: 3100, cls: 0.08, inpMs: 180, totalByteWeight: 5_100_000 },
    }),
    safebrowsing: ok('safebrowsing', { flagged: false, threats: [] }),
    httpsEnforced: ok('httpsEnforced', {
      httpsSupported: true,
      httpRedirectsToHttps: false,
      finalUrl: 'http://joes-hvac.com/',
      mixedContentCount: 3,
      mixedContentSamples: ['http://joes-hvac.com/img/banner.jpg'],
    }),
    localVisibility: ok('localVisibility', {
      provider: 'dataforseo',
      location: 'Austin,Texas,United States',
      rankings: [
        { keyword: 'hvac repair austin', position: null, mapPack: false, topCompetitors: ['coolbreezehvac.com', 'austinairpros.com'] },
        { keyword: 'ac repair austin', position: null, mapPack: false, topCompetitors: ['coolbreezehvac.com'] },
        { keyword: 'furnace repair austin', position: 31, mapPack: false, topCompetitors: ['austinairpros.com'] },
      ],
      inMapPack: false,
      serpCostUsd: 0.006,
    }),
    napConsistency: ok('napConsistency', {
      businessName: "Joe's HVAC",
      listings: [
        { source: 'google', found: true, name: "Joe's HVAC", address: '123 Main St, Austin, TX', phone: '+15125551234', hours: null, rating: 4.8, reviewCount: 120, url: 'https://joes-hvac.com' },
        { source: 'yelp', found: true, name: 'Joes HVAC', address: '500 Old Rd, Austin, TX', phone: '+15125559999', hours: null, rating: 4.5, reviewCount: 40, url: 'https://yelp.com/biz/joes-hvac' },
        { source: 'facebook', found: false, name: null, address: null, phone: null, hours: null, rating: null, reviewCount: null, url: null },
      ],
      comparedFields: ['phone', 'address', 'name'],
      mismatches: [
        {
          field: 'phone',
          sources: ['google', 'yelp'],
          values: ['+15125551234', '+15125559999'],
          message: 'The phone number doesn\'t match everywhere: Google shows "+15125551234", but Yelp shows "+15125559999". Customers calling the wrong number is lost business.',
        },
      ],
      foundCount: 2,
    }),
  });
}

/** A scan where most external checks could not run (offline/concierge mode). */
export function sparseScan(): ScanResult {
  const healthy = healthyScan();
  return build({
    ...healthy.checks,
    pagespeed: skipped('pagespeed', 'PAGESPEED_API_KEY not set'),
    safebrowsing: skipped('safebrowsing', 'SAFE_BROWSING_API_KEY not set'),
    localVisibility: skipped('localVisibility', 'no SERP provider configured'),
    napConsistency: skipped('napConsistency', 'no listing platform reachable'),
  });
}

export { errored as erroredCheck, ok as okCheck };
