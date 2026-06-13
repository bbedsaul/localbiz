export type CheckType =
  | 'uptime'
  | 'ssl'
  | 'domain'
  | 'crawl'
  | 'pagespeed'
  | 'safebrowsing'
  | 'httpsEnforced'
  | 'localVisibility'
  | 'napConsistency';

/** 'skipped' means the check could not run (e.g. missing API key), not that it failed. */
export type CheckStatus = 'ok' | 'error' | 'skipped';

export interface CheckTarget {
  url: string;
  category?: string;
  city?: string;
  /** Business name; falls back to a name derived from the domain when omitted. */
  name?: string;
  /** Tracked local-search keywords (max 5 used per scan). */
  keywords?: string[];
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

export interface KeywordRank {
  keyword: string;
  /** Organic position, null when not in the top 50. */
  position: number | null;
  mapPack: boolean;
  topCompetitors: string[];
}

export interface LocalVisibilityRaw {
  provider: string;
  location: string;
  rankings: KeywordRank[];
  inMapPack: boolean;
  /** Vendor-reported API spend for this scan, when available. */
  serpCostUsd: number | null;
}

export type ListingSource = 'google' | 'yelp' | 'facebook';

export interface Listing {
  source: ListingSource;
  found: boolean;
  /** Set when the platform could not be queried at all (missing key, API error). */
  unavailableReason?: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  hours: string[] | null;
  rating: number | null;
  reviewCount: number | null;
  url: string | null;
}

export type NapField = 'name' | 'address' | 'phone' | 'hours';

export interface NapMismatch {
  field: NapField;
  sources: ListingSource[];
  values: string[];
  /** Plain-English description for the report. */
  message: string;
}

export interface NapConsistencyRaw {
  businessName: string;
  listings: Listing[];
  /** Fields that had values on 2+ listings and could be compared. */
  comparedFields: NapField[];
  mismatches: NapMismatch[];
  foundCount: number;
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
    localVisibility: CheckResult<LocalVisibilityRaw>;
    napConsistency: CheckResult<NapConsistencyRaw>;
  };
  scores: ScoreBreakdown;
}
