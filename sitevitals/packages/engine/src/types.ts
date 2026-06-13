export type CheckType =
  | 'uptime'
  | 'ssl'
  | 'domain'
  | 'crawl'
  | 'pagespeed'
  | 'safebrowsing'
  | 'httpsEnforced';

/** 'skipped' means the check could not run (e.g. missing API key), not that it failed. */
export type CheckStatus = 'ok' | 'error' | 'skipped';

export interface CheckTarget {
  url: string;
  category?: string;
  city?: string;
}

export interface CheckResult<Raw = unknown> {
  type: CheckType;
  status: CheckStatus;
  ranAt: string;
  durationMs: number;
  raw: Raw | null;
  error?: string;
}

export interface Check<Raw = unknown> {
  type: CheckType;
  run(target: CheckTarget): Promise<CheckResult<Raw>>;
}

// ---------------------------------------------------------------------------
// Per-check raw payloads
// ---------------------------------------------------------------------------

export interface RedirectHop {
  url: string;
  status: number;
}

export interface UptimeRaw {
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  redirects: RedirectHop[];
  up: boolean;
}

export interface SslRaw {
  valid: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
}

export interface DomainRaw {
  /** false when no RDAP server covers this TLD/registrar — not an error. */
  supported: boolean;
  domain: string;
  registrar: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
}

export interface BrokenLink {
  url: string;
  foundOn: string;
  status: number | null;
  reason: string;
}

export interface CrawlRaw {
  pagesCrawled: number;
  brokenLinks: BrokenLink[];
  missingTitles: string[];
  duplicateTitles: { title: string; pages: string[] }[];
  missingMetaDescriptions: string[];
  duplicateMetaDescriptions: { description: string; pages: string[] }[];
  imagesMissingAlt: { page: string; src: string }[];
  totalImages: number;
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  hasFavicon: boolean;
  hasViewportMeta: boolean;
}

export interface PagespeedStrategyRaw {
  /** Lighthouse performance score, 0–100. */
  performanceScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  totalByteWeight: number | null;
}

export interface PagespeedRaw {
  mobile: PagespeedStrategyRaw | null;
  desktop: PagespeedStrategyRaw | null;
}

export interface SafeBrowsingRaw {
  flagged: boolean;
  threats: string[];
}

export interface HttpsEnforcedRaw {
  httpsSupported: boolean;
  httpRedirectsToHttps: boolean;
  finalUrl: string | null;
  mixedContentCount: number;
  mixedContentSamples: string[];
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type CategoryId =
  | 'uptime'
  | 'performance'
  | 'mobile'
  | 'localSearch'
  | 'listings'
  | 'hygiene'
  | 'security';

export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface CategoryScore {
  id: CategoryId;
  label: string;
  /** Canonical weight from the product spec (fraction of 1). */
  weight: number;
  /** 0–100, or null when the category could not be measured this scan. */
  score: number | null;
}

export interface ScoreBreakdown {
  categories: CategoryScore[];
  /**
   * Weighted average over measured categories only — weights of unmeasured
   * categories are renormalized away rather than counted as zero.
   */
  composite: number;
  grade: LetterGrade;
}

// ---------------------------------------------------------------------------
// Scan result — the schema the report generator consumes
// ---------------------------------------------------------------------------

export interface ScanResult {
  engineVersion: string;
  url: string;
  category?: string;
  city?: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  checks: {
    uptime: CheckResult<UptimeRaw>;
    ssl: CheckResult<SslRaw>;
    domain: CheckResult<DomainRaw>;
    crawl: CheckResult<CrawlRaw>;
    pagespeed: CheckResult<PagespeedRaw>;
    safebrowsing: CheckResult<SafeBrowsingRaw>;
    httpsEnforced: CheckResult<HttpsEnforcedRaw>;
  };
  scores: ScoreBreakdown;
}
