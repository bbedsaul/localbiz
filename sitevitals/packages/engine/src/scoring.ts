import type {
  CategoryId,
  CategoryScore,
  CheckResult,
  CrawlRaw,
  DomainRaw,
  HttpsEnforcedRaw,
  LetterGrade,
  LocalVisibilityRaw,
  NapConsistencyRaw,
  PagespeedRaw,
  ScanResult,
  ScoreBreakdown,
  SslRaw,
  UptimeRaw,
} from './types.js';

/** Canonical category weights from the product spec (sum to 1). */
export const CATEGORY_WEIGHTS: Record<CategoryId, { label: string; weight: number }> = {
  uptime: { label: 'Uptime & availability', weight: 0.25 },
  performance: { label: 'Performance', weight: 0.15 },
  mobile: { label: 'Mobile friendliness', weight: 0.1 },
  localSearch: { label: 'Local search visibility', weight: 0.2 },
  listings: { label: 'Listing consistency', weight: 0.15 },
  hygiene: { label: 'Content & technical hygiene', weight: 0.1 },
  security: { label: 'Security & trust', weight: 0.05 },
};

function clamp(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function ok<Raw>(result: CheckResult<Raw> | undefined): Raw | null {
  return result?.status === 'ok' ? result.raw : null;
}

/**
 * C1 — uptime, response time, SSL validity, domain expiry.
 * An errored uptime check means the site was unreachable: that scores 0, it is
 * not "unmeasured".
 */
export function scoreUptimeCategory(
  uptime: CheckResult<UptimeRaw> | undefined,
  ssl: CheckResult<SslRaw> | undefined,
  domain: CheckResult<DomainRaw> | undefined,
): number | null {
  if (!uptime || uptime.status === 'skipped') return null;
  const up = ok(uptime);
  if (!up || !up.up) return 0;

  let score = 100;

  // Response time: free under 1s, then -1 point per 200ms, capped at -20.
  if (up.responseTimeMs > 1000) {
    score -= Math.min(20, (up.responseTimeMs - 1000) / 200);
  }

  const cert = ok(ssl);
  if (ssl && ssl.status === 'error') score -= 40;
  if (cert) {
    if (!cert.valid) score -= 40;
    if (cert.daysRemaining !== null) {
      if (cert.daysRemaining < 7) score -= 30;
      else if (cert.daysRemaining < 30) score -= 15;
    }
  }

  const dom = ok(domain);
  if (dom?.daysRemaining !== null && dom?.daysRemaining !== undefined) {
    if (dom.daysRemaining < 7) score -= 30;
    else if (dom.daysRemaining < 30) score -= 15;
  }

  return clamp(score);
}

/** C2 — average of available Lighthouse performance scores. */
export function scorePerformanceCategory(
  pagespeed: CheckResult<PagespeedRaw> | undefined,
): number | null {
  const psi = ok(pagespeed);
  const scores = [psi?.mobile?.performanceScore, psi?.desktop?.performanceScore].filter(
    (s): s is number => typeof s === 'number',
  );
  if (scores.length === 0) return null;
  return clamp(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * C3 — viewport meta (40 pts) + mobile Lighthouse performance (60 pts).
 * With no PageSpeed data we can only judge the viewport tag, so the ceiling
 * drops: viewport alone earns 70, missing it earns 10.
 */
export function scoreMobileCategory(
  pagespeed: CheckResult<PagespeedRaw> | undefined,
  crawl: CheckResult<CrawlRaw> | undefined,
): number | null {
  const mobilePerf = ok(pagespeed)?.mobile?.performanceScore ?? null;
  const crawled = ok(crawl);
  if (mobilePerf === null && !crawled) return null;
  const viewport = crawled?.hasViewportMeta ?? false;
  if (mobilePerf === null) return viewport ? 70 : 10;
  return clamp(mobilePerf * 0.6 + (viewport ? 40 : 0));
}

/** C6 — broken links, titles/descriptions, alt text, sitemap/robots/favicon. */
export function scoreHygieneCategory(crawl: CheckResult<CrawlRaw> | undefined): number | null {
  const c = ok(crawl);
  if (!c || c.pagesCrawled === 0) return null;

  let score = 100;
  score -= Math.min(30, c.brokenLinks.length * 5);
  score -= Math.min(15, c.missingTitles.length * 3);
  score -= Math.min(10, c.duplicateTitles.length * 2);
  score -= 15 * (c.missingMetaDescriptions.length / c.pagesCrawled);
  score -= Math.min(10, c.duplicateMetaDescriptions.length * 2);
  if (c.totalImages > 0) {
    score -= 15 * (c.imagesMissingAlt.length / c.totalImages);
  }
  if (!c.hasSitemap) score -= 10;
  if (!c.hasRobotsTxt) score -= 5;
  if (!c.hasFavicon) score -= 5;
  return clamp(score);
}

/** C7 — HTTPS enforcement, mixed content, Safe Browsing verdict. */
export function scoreSecurityCategory(
  httpsEnforced: CheckResult<HttpsEnforcedRaw> | undefined,
  safebrowsing: CheckResult<{ flagged: boolean; threats: string[] }> | undefined,
): number | null {
  const https = ok(httpsEnforced);
  const sb = ok(safebrowsing);
  if (!https && !sb) return null;

  if (sb?.flagged) return 0;

  let score = 100;
  if (https) {
    if (!https.httpsSupported) return 0;
    if (!https.httpRedirectsToHttps) score -= 50;
    if (https.mixedContentCount > 0) {
      score -= Math.min(30, 10 + https.mixedContentCount * 2);
    }
  }
  return clamp(score);
}

/** Spec buckets: position 1–3 → 100, 4–10 → 75, 11–20 → 50, 21–50 → 25, absent → 0. */
export function positionScore(position: number | null): number {
  if (position === null || position > 50) return 0;
  if (position <= 3) return 100;
  if (position <= 10) return 75;
  if (position <= 20) return 50;
  return 25;
}

/** C4 — average keyword position score, +10 map-pack bonus, capped at 100. */
export function scoreLocalSearchCategory(
  localVisibility: CheckResult<LocalVisibilityRaw> | undefined,
): number | null {
  const lv = ok(localVisibility);
  if (!lv || lv.rankings.length === 0) return null;
  const average =
    lv.rankings.reduce((sum, r) => sum + positionScore(r.position), 0) / lv.rankings.length;
  return clamp(average + (lv.inMapPack ? 10 : 0));
}

/**
 * C5 — NAP consistency across found listings, plus presence: each platform
 * that was queryable but has no listing costs 15 points. With only one
 * listing found nothing can be compared, so the base is a neutral 70.
 */
export function scoreListingsCategory(
  napConsistency: CheckResult<NapConsistencyRaw> | undefined,
  fieldWeights: Record<string, number> = { phone: 0.3, address: 0.3, name: 0.25, hours: 0.15 },
): number | null {
  const nap = ok(napConsistency);
  if (!nap) return null;

  const queryable = nap.listings.filter((l) => !l.unavailableReason);
  if (queryable.length === 0) return null;

  const notFoundCount = queryable.filter((l) => !l.found).length;
  if (nap.foundCount === 0) return 0;

  let base: number;
  const comparedWeight = nap.comparedFields.reduce((sum, f) => sum + (fieldWeights[f] ?? 0), 0);
  if (comparedWeight > 0) {
    const mismatchedWeight = nap.mismatches.reduce(
      (sum, m) => sum + (fieldWeights[m.field] ?? 0),
      0,
    );
    base = 100 * (1 - mismatchedWeight / comparedWeight);
  } else {
    base = 70;
  }

  return clamp(base - 15 * notFoundCount);
}

export function letterGrade(composite: number): LetterGrade {
  if (composite >= 90) return 'A';
  if (composite >= 80) return 'B';
  if (composite >= 70) return 'C';
  if (composite >= 60) return 'D';
  return 'F';
}

/**
 * Composite over measured categories only: unmeasured categories (null score —
 * e.g. local search and listings, which this CLI does not check) have their
 * weight renormalized away instead of dragging the grade to zero.
 */
export function compositeScore(categories: CategoryScore[]): number {
  const measured = categories.filter((c) => c.score !== null);
  const totalWeight = measured.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = measured.reduce((sum, c) => sum + (c.score as number) * c.weight, 0);
  return Math.round((weighted / totalWeight) * 10) / 10;
}

export function scoreScan(checks: ScanResult['checks']): ScoreBreakdown {
  const values: Record<CategoryId, number | null> = {
    uptime: scoreUptimeCategory(checks.uptime, checks.ssl, checks.domain),
    performance: scorePerformanceCategory(checks.pagespeed),
    mobile: scoreMobileCategory(checks.pagespeed, checks.crawl),
    localSearch: scoreLocalSearchCategory(checks.localVisibility),
    listings: scoreListingsCategory(checks.napConsistency),
    hygiene: scoreHygieneCategory(checks.crawl),
    security: scoreSecurityCategory(checks.httpsEnforced, checks.safebrowsing),
  };

  const categories: CategoryScore[] = (
    Object.entries(CATEGORY_WEIGHTS) as [CategoryId, { label: string; weight: number }][]
  ).map(([id, { label, weight }]) => ({ id, label, weight, score: values[id] }));

  const composite = compositeScore(categories);
  return { categories, composite, grade: letterGrade(composite) };
}
