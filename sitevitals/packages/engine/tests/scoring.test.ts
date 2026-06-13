import { describe, expect, it } from 'vitest';
import {
  compositeScore,
  letterGrade,
  positionScore,
  scoreHygieneCategory,
  scoreListingsCategory,
  scoreLocalSearchCategory,
  scoreMobileCategory,
  scorePerformanceCategory,
  scoreScan,
  scoreSecurityCategory,
  scoreUptimeCategory,
} from '../src/scoring.js';
import type {
  CheckResult,
  CheckType,
  CrawlRaw,
  HttpsEnforcedRaw,
  Listing,
  LocalVisibilityRaw,
  NapConsistencyRaw,
  PagespeedRaw,
  ScanResult,
  SslRaw,
  UptimeRaw,
} from '../src/types.js';

function result<Raw>(type: CheckType, raw: Raw): CheckResult<Raw> {
  return { type, status: 'ok', ranAt: '2026-06-12T00:00:00.000Z', durationMs: 1, raw };
}

function errored(type: CheckType): CheckResult<never> {
  return {
    type,
    status: 'error',
    ranAt: '2026-06-12T00:00:00.000Z',
    durationMs: 1,
    raw: null,
    error: 'boom',
  };
}

function skipped(type: CheckType): CheckResult<never> {
  return {
    type,
    status: 'skipped',
    ranAt: '2026-06-12T00:00:00.000Z',
    durationMs: 0,
    raw: null,
    error: 'no API key',
  };
}

const healthyUptime: UptimeRaw = {
  finalUrl: 'https://example.com/',
  statusCode: 200,
  responseTimeMs: 350,
  redirects: [],
  up: true,
};

const healthySsl: SslRaw = {
  valid: true,
  issuer: "Let's Encrypt / R11",
  subject: 'example.com',
  validFrom: '2026-04-01T00:00:00.000Z',
  validTo: '2026-09-01T00:00:00.000Z',
  daysRemaining: 80,
};

const healthyDomain = {
  supported: true,
  domain: 'example.com',
  registrar: 'NameCheap',
  expiresAt: '2027-06-01T00:00:00.000Z',
  daysRemaining: 354,
};

const cleanCrawl: CrawlRaw = {
  pagesCrawled: 10,
  brokenLinks: [],
  missingTitles: [],
  duplicateTitles: [],
  missingMetaDescriptions: [],
  duplicateMetaDescriptions: [],
  imagesMissingAlt: [],
  totalImages: 20,
  hasSitemap: true,
  hasRobotsTxt: true,
  hasFavicon: true,
  hasViewportMeta: true,
};

const goodPsi: PagespeedRaw = {
  mobile: { performanceScore: 90, lcpMs: 1800, cls: 0.02, inpMs: 150, totalByteWeight: 900_000 },
  desktop: { performanceScore: 98, lcpMs: 1100, cls: 0.01, inpMs: 90, totalByteWeight: 850_000 },
};

const secureHttps: HttpsEnforcedRaw = {
  httpsSupported: true,
  httpRedirectsToHttps: true,
  finalUrl: 'https://example.com/',
  mixedContentCount: 0,
  mixedContentSamples: [],
};

describe('scoreUptimeCategory', () => {
  it('scores a fast healthy site 100', () => {
    expect(
      scoreUptimeCategory(
        result('uptime', healthyUptime),
        result('ssl', healthySsl),
        result('domain', healthyDomain),
      ),
    ).toBe(100);
  });

  it('scores an unreachable site 0, not unmeasured', () => {
    expect(scoreUptimeCategory(errored('uptime'), undefined, undefined)).toBe(0);
  });

  it('scores HTTP 500 as down', () => {
    const down = { ...healthyUptime, statusCode: 500, up: false };
    expect(scoreUptimeCategory(result('uptime', down), undefined, undefined)).toBe(0);
  });

  it('penalizes slow responses, capped at 20 points', () => {
    const slow = { ...healthyUptime, responseTimeMs: 3000 };
    expect(scoreUptimeCategory(result('uptime', slow), undefined, undefined)).toBe(90);
    const glacial = { ...healthyUptime, responseTimeMs: 30_000 };
    expect(scoreUptimeCategory(result('uptime', glacial), undefined, undefined)).toBe(80);
  });

  it('penalizes an invalid certificate', () => {
    const badSsl = { ...healthySsl, valid: false };
    expect(
      scoreUptimeCategory(result('uptime', healthyUptime), result('ssl', badSsl), undefined),
    ).toBe(60);
  });

  it('penalizes imminent cert and domain expiry', () => {
    const expiringSsl = { ...healthySsl, daysRemaining: 5 };
    const expiringDomain = { ...healthyDomain, daysRemaining: 20 };
    expect(
      scoreUptimeCategory(
        result('uptime', healthyUptime),
        result('ssl', expiringSsl),
        result('domain', expiringDomain),
      ),
    ).toBe(55); // 100 - 30 (cert <7d) - 15 (domain <30d)
  });

  it('returns null when uptime was never measured', () => {
    expect(scoreUptimeCategory(undefined, undefined, undefined)).toBeNull();
    expect(scoreUptimeCategory(skipped('uptime'), undefined, undefined)).toBeNull();
  });
});

describe('scorePerformanceCategory', () => {
  it('averages mobile and desktop scores', () => {
    expect(scorePerformanceCategory(result('pagespeed', goodPsi))).toBe(94);
  });

  it('uses the single available strategy', () => {
    const mobileOnly: PagespeedRaw = { mobile: goodPsi.mobile, desktop: null };
    expect(scorePerformanceCategory(result('pagespeed', mobileOnly))).toBe(90);
  });

  it('returns null when pagespeed was skipped', () => {
    expect(scorePerformanceCategory(skipped('pagespeed'))).toBeNull();
  });
});

describe('scoreMobileCategory', () => {
  it('combines mobile perf (60%) and viewport (40 pts)', () => {
    expect(scoreMobileCategory(result('pagespeed', goodPsi), result('crawl', cleanCrawl))).toBe(94);
  });

  it('drops 40 points without a viewport meta tag', () => {
    const noViewport = { ...cleanCrawl, hasViewportMeta: false };
    expect(scoreMobileCategory(result('pagespeed', goodPsi), result('crawl', noViewport))).toBe(54);
  });

  it('falls back to viewport-only scoring without pagespeed', () => {
    expect(scoreMobileCategory(skipped('pagespeed'), result('crawl', cleanCrawl))).toBe(70);
    const noViewport = { ...cleanCrawl, hasViewportMeta: false };
    expect(scoreMobileCategory(skipped('pagespeed'), result('crawl', noViewport))).toBe(10);
  });

  it('returns null with neither input', () => {
    expect(scoreMobileCategory(skipped('pagespeed'), errored('crawl'))).toBeNull();
  });
});

describe('scoreHygieneCategory', () => {
  it('scores a clean crawl 100', () => {
    expect(scoreHygieneCategory(result('crawl', cleanCrawl))).toBe(100);
  });

  it('subtracts for each issue class', () => {
    const messy: CrawlRaw = {
      ...cleanCrawl,
      pagesCrawled: 10,
      brokenLinks: [{ url: 'x', foundOn: 'y', status: 404, reason: 'HTTP 404' }],
      missingTitles: ['a'],
      missingMetaDescriptions: ['a', 'b'], // 2/10 pages → -3
      imagesMissingAlt: [{ page: 'a', src: 'i' }], // 1/20 imgs → -0.75
      hasSitemap: false,
    };
    // 100 - 5 (broken) - 3 (title) - 3 (meta) - 0.75 (alt) - 10 (sitemap) = 78.25 → 78
    expect(scoreHygieneCategory(result('crawl', messy))).toBe(78);
  });

  it('never goes below 0', () => {
    const disaster: CrawlRaw = {
      ...cleanCrawl,
      pagesCrawled: 2,
      brokenLinks: Array(20).fill({ url: 'x', foundOn: 'y', status: 404, reason: 'HTTP 404' }),
      missingTitles: Array(10).fill('x'),
      duplicateTitles: Array(10).fill({ title: 't', pages: ['a', 'b'] }),
      missingMetaDescriptions: ['a', 'b'],
      duplicateMetaDescriptions: Array(10).fill({ description: 'd', pages: ['a', 'b'] }),
      imagesMissingAlt: Array(20).fill({ page: 'a', src: 'i' }),
      hasSitemap: false,
      hasRobotsTxt: false,
      hasFavicon: false,
    };
    const score = scoreHygieneCategory(result('crawl', disaster));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(30);
  });

  it('returns null when the crawl failed', () => {
    expect(scoreHygieneCategory(errored('crawl'))).toBeNull();
  });
});

describe('scoreSecurityCategory', () => {
  it('scores enforced https with clean safe browsing 100', () => {
    expect(
      scoreSecurityCategory(
        result('httpsEnforced', secureHttps),
        result('safebrowsing', { flagged: false, threats: [] }),
      ),
    ).toBe(100);
  });

  it('zeroes the score for a Safe Browsing flag', () => {
    expect(
      scoreSecurityCategory(
        result('httpsEnforced', secureHttps),
        result('safebrowsing', { flagged: true, threats: ['MALWARE'] }),
      ),
    ).toBe(0);
  });

  it('halves the score when http does not redirect to https', () => {
    const lax = { ...secureHttps, httpRedirectsToHttps: false };
    expect(scoreSecurityCategory(result('httpsEnforced', lax), undefined)).toBe(50);
  });

  it('penalizes mixed content', () => {
    const mixed = { ...secureHttps, mixedContentCount: 3 };
    expect(scoreSecurityCategory(result('httpsEnforced', mixed), undefined)).toBe(84);
  });

  it('returns null with no security signals at all', () => {
    expect(scoreSecurityCategory(errored('httpsEnforced'), skipped('safebrowsing'))).toBeNull();
  });
});

function rank(keyword: string, position: number | null, mapPack = false): LocalVisibilityRaw['rankings'][number] {
  return { keyword, position, mapPack, topCompetitors: ['competitor-a.com', 'competitor-b.com'] };
}

function visibility(rankings: LocalVisibilityRaw['rankings']): LocalVisibilityRaw {
  return {
    provider: 'dataforseo',
    location: 'Austin,Texas,United States',
    rankings,
    inMapPack: rankings.some((r) => r.mapPack),
    serpCostUsd: 0.006,
  };
}

function foundListing(source: Listing['source'], overrides: Partial<Listing> = {}): Listing {
  return {
    source,
    found: true,
    name: "Joe's HVAC",
    address: '123 Main St',
    phone: '+15125551234',
    hours: null,
    rating: 4.8,
    reviewCount: 100,
    url: null,
    ...overrides,
  };
}

function napRaw(listings: Listing[], mismatches: NapConsistencyRaw['mismatches'], comparedFields: NapConsistencyRaw['comparedFields']): NapConsistencyRaw {
  return {
    businessName: "Joe's HVAC",
    listings,
    comparedFields,
    mismatches,
    foundCount: listings.filter((l) => l.found).length,
  };
}

describe('positionScore buckets', () => {
  it('maps spec boundaries exactly', () => {
    expect(positionScore(1)).toBe(100);
    expect(positionScore(3)).toBe(100);
    expect(positionScore(4)).toBe(75);
    expect(positionScore(10)).toBe(75);
    expect(positionScore(11)).toBe(50);
    expect(positionScore(20)).toBe(50);
    expect(positionScore(21)).toBe(25);
    expect(positionScore(50)).toBe(25);
    expect(positionScore(null)).toBe(0);
  });
});

describe('scoreLocalSearchCategory', () => {
  it('averages across keywords', () => {
    const lv = visibility([rank('a', 2), rank('b', 7), rank('c', null)]);
    // (100 + 75 + 0) / 3 = 58.33 → 58
    expect(scoreLocalSearchCategory(result('localVisibility', lv))).toBe(58);
  });

  it('adds a +10 map-pack bonus capped at 100', () => {
    const bonus = visibility([rank('a', 5, true), rank('b', 15)]);
    // (75 + 50)/2 = 62.5 + 10 = 72.5 → 73
    expect(scoreLocalSearchCategory(result('localVisibility', bonus))).toBe(73);

    const capped = visibility([rank('a', 1, true), rank('b', 2)]);
    expect(scoreLocalSearchCategory(result('localVisibility', capped))).toBe(100);
  });

  it('scores all-absent keywords 0 (map pack can still rescue 10)', () => {
    expect(scoreLocalSearchCategory(result('localVisibility', visibility([rank('a', null)])))).toBe(0);
    expect(
      scoreLocalSearchCategory(result('localVisibility', visibility([rank('a', null, true)]))),
    ).toBe(10);
  });

  it('returns null when skipped or empty', () => {
    expect(scoreLocalSearchCategory(skipped('localVisibility'))).toBeNull();
    expect(scoreLocalSearchCategory(result('localVisibility', visibility([])))).toBeNull();
  });
});

describe('scoreListingsCategory', () => {
  it('scores three consistent listings 100', () => {
    const raw = napRaw(
      [foundListing('google'), foundListing('yelp'), foundListing('facebook')],
      [],
      ['phone', 'address', 'name'],
    );
    expect(scoreListingsCategory(result('napConsistency', raw))).toBe(100);
  });

  it('deducts the weight share of mismatched fields', () => {
    const raw = napRaw(
      [foundListing('google'), foundListing('yelp', { phone: '+15125559999' })],
      [
        {
          field: 'phone',
          sources: ['google', 'yelp'],
          values: ['+15125551234', '+15125559999'],
          message: 'phones differ',
        },
      ],
      ['phone', 'address', 'name'],
    );
    // compared weight 0.85, mismatched 0.30 → 100*(1-0.3/0.85) = 64.7 → 65; one
    // queryable platform (facebook) missing from the listings array is not penalized
    // because only 2 listings were queried here.
    expect(scoreListingsCategory(result('napConsistency', raw))).toBe(65);
  });

  it('penalizes platforms with no listing found', () => {
    const raw = napRaw(
      [
        foundListing('google'),
        foundListing('yelp'),
        { ...foundListing('facebook'), found: false, name: null, address: null, phone: null },
      ],
      [],
      ['phone', 'address', 'name'],
    );
    expect(scoreListingsCategory(result('napConsistency', raw))).toBe(85);
  });

  it('gives a single found listing the neutral base minus missing penalties', () => {
    const raw = napRaw(
      [
        foundListing('google'),
        { ...foundListing('yelp'), found: false, name: null, address: null, phone: null },
        { ...foundListing('facebook'), found: false, name: null, address: null, phone: null },
      ],
      [],
      [],
    );
    // base 70 (nothing comparable) - 2×15 missing = 40
    expect(scoreListingsCategory(result('napConsistency', raw))).toBe(40);
  });

  it('scores zero listings found as 0', () => {
    const raw = napRaw(
      [{ ...foundListing('google'), found: false, name: null, address: null, phone: null }],
      [],
      [],
    );
    expect(scoreListingsCategory(result('napConsistency', raw))).toBe(0);
  });

  it('returns null when skipped or no platform was queryable', () => {
    expect(scoreListingsCategory(skipped('napConsistency'))).toBeNull();
    const allUnavailable = napRaw(
      [
        { ...foundListing('google'), found: false, unavailableReason: 'no key' },
        { ...foundListing('yelp'), found: false, unavailableReason: 'no key' },
      ],
      [],
      [],
    );
    expect(scoreListingsCategory(result('napConsistency', allUnavailable))).toBeNull();
  });
});

describe('letterGrade', () => {
  it('maps boundaries exactly', () => {
    expect(letterGrade(100)).toBe('A');
    expect(letterGrade(90)).toBe('A');
    expect(letterGrade(89.9)).toBe('B');
    expect(letterGrade(80)).toBe('B');
    expect(letterGrade(70)).toBe('C');
    expect(letterGrade(60)).toBe('D');
    expect(letterGrade(59.9)).toBe('F');
    expect(letterGrade(0)).toBe('F');
  });
});

describe('compositeScore', () => {
  it('renormalizes weights over measured categories', () => {
    const categories = [
      { id: 'uptime' as const, label: '', weight: 0.25, score: 100 },
      { id: 'localSearch' as const, label: '', weight: 0.2, score: null },
      { id: 'security' as const, label: '', weight: 0.05, score: 40 },
    ];
    // (100*0.25 + 40*0.05) / 0.30 = 90
    expect(compositeScore(categories)).toBe(90);
  });

  it('returns 0 when nothing was measured', () => {
    expect(compositeScore([{ id: 'uptime', label: '', weight: 0.25, score: null }])).toBe(0);
  });
});

describe('scoreScan', () => {
  function fullChecks(): ScanResult['checks'] {
    return {
      uptime: result('uptime', healthyUptime),
      ssl: result('ssl', healthySsl),
      domain: result('domain', healthyDomain),
      crawl: result('crawl', cleanCrawl),
      pagespeed: result('pagespeed', goodPsi),
      safebrowsing: result('safebrowsing', { flagged: false, threats: [] }),
      httpsEnforced: result('httpsEnforced', secureHttps),
      localVisibility: result('localVisibility', visibility([rank('a', 2, true), rank('b', 5)])),
      napConsistency: result(
        'napConsistency',
        napRaw(
          [foundListing('google'), foundListing('yelp'), foundListing('facebook')],
          [],
          ['phone', 'address', 'name'],
        ),
      ),
    };
  }

  it('grades a healthy site A and is deterministic, measuring all 7 categories', () => {
    const first = scoreScan(fullChecks());
    const second = scoreScan(fullChecks());
    expect(first).toEqual(second);
    expect(first.grade).toBe('A');
    expect(first.composite).toBeGreaterThanOrEqual(90);
    expect(first.categories).toHaveLength(7);
    expect(first.categories.every((c) => c.score !== null)).toBe(true);
    // (100+75)/2 + 10 = 97.5 → 98
    expect(first.categories.find((c) => c.id === 'localSearch')?.score).toBe(98);
    expect(first.categories.find((c) => c.id === 'listings')?.score).toBe(100);
  });

  it('renormalizes C4/C5 away when SERP and listing checks are skipped', () => {
    const checks = {
      ...fullChecks(),
      localVisibility: skipped('localVisibility'),
      napConsistency: skipped('napConsistency'),
    };
    const scores = scoreScan(checks);
    expect(scores.categories.find((c) => c.id === 'localSearch')?.score).toBeNull();
    expect(scores.categories.find((c) => c.id === 'listings')?.score).toBeNull();
    expect(scores.grade).toBe('A'); // healthy site, fewer measured categories
  });

  it('still produces a grade when every check failed or was skipped', () => {
    const checks: ScanResult['checks'] = {
      uptime: errored('uptime'),
      ssl: errored('ssl'),
      domain: errored('domain'),
      crawl: errored('crawl'),
      pagespeed: skipped('pagespeed'),
      safebrowsing: skipped('safebrowsing'),
      httpsEnforced: errored('httpsEnforced'),
      localVisibility: skipped('localVisibility'),
      napConsistency: skipped('napConsistency'),
    };
    const scores = scoreScan(checks);
    // Unreachable site: uptime measured as 0, everything else unmeasured.
    expect(scores.composite).toBe(0);
    expect(scores.grade).toBe('F');
  });
});
