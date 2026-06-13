import {
  crawlCheck,
  domainCheck,
  httpsEnforcedCheck,
  scoreScan,
  sslCheck,
  uptimeCheck,
  type CategoryScore,
  type CheckResult,
  type CheckTarget,
  type CheckType,
  type LetterGrade,
  type ScanResult,
} from '@sitevitals/engine';

/**
 * The "limited instant scan" used by the free hero tool and onboarding: the
 * checks that need no API keys and finish in a few seconds. PageSpeed, SERP,
 * listings, and Safe Browsing are deferred to the worker's full scan after
 * signup, so they're reported as skipped here.
 */
export const FAST_CHECKS: {
  type: CheckType;
  label: string;
  run: (t: CheckTarget) => Promise<CheckResult>;
}[] = [
  { type: 'uptime', label: 'Loading speed & uptime', run: uptimeCheck.run },
  { type: 'ssl', label: 'Security certificate', run: sslCheck.run },
  { type: 'httpsEnforced', label: 'Secure connection', run: httpsEnforcedCheck.run },
  { type: 'domain', label: 'Domain registration', run: domainCheck.run },
  { type: 'crawl', label: 'Pages, links & content', run: crawlCheck.run },
];

const DEFERRED: CheckType[] = ['pagespeed', 'safebrowsing', 'localVisibility', 'napConsistency'];

function skipped(type: CheckType): CheckResult {
  return {
    type,
    status: 'skipped',
    ranAt: new Date().toISOString(),
    durationMs: 0,
    raw: null,
    error: 'measured in your full report after signup',
  };
}

export interface ScanProgressEvent {
  type: 'check';
  name: CheckType;
  label: string;
  status: 'ok' | 'error' | 'skipped';
  summary: string;
}

export interface ScanDoneEvent {
  type: 'done';
  grade: LetterGrade;
  composite: number;
  categories: CategoryScore[];
  measuredCount: number;
}

function summarize(result: CheckResult): string {
  if (result.status !== 'ok' || !result.raw) return result.error ?? 'could not be checked';
  const raw = result.raw as Record<string, unknown>;
  switch (result.type) {
    case 'uptime':
      return raw.up ? `Loads in ${((raw.responseTimeMs as number) / 1000).toFixed(1)}s` : 'Not loading';
    case 'ssl':
      return raw.valid ? `Valid, ${raw.daysRemaining} days left` : 'Invalid certificate';
    case 'httpsEnforced':
      return raw.httpRedirectsToHttps ? 'Secure (https) enforced' : 'Insecure version reachable';
    case 'domain':
      return raw.daysRemaining != null ? `Expires in ${raw.daysRemaining} days` : 'Registration found';
    case 'crawl':
      return `${raw.pagesCrawled} pages, ${(raw.brokenLinks as unknown[]).length} broken links`;
    default:
      return 'Checked';
  }
}

/** Run the fast checks concurrently, invoking `onEvent` as each completes. */
export async function runFastScan(
  url: string,
  onEvent: (e: ScanProgressEvent) => void,
): Promise<ScanDoneEvent> {
  const target: CheckTarget = { url };
  const results = new Map<CheckType, CheckResult>();

  await Promise.all(
    FAST_CHECKS.map(async ({ type, label, run }) => {
      const result = await run(target).catch((err: unknown) => skipped(type) as CheckResult);
      results.set(type, result);
      onEvent({
        type: 'check',
        name: type,
        label,
        status: result.status,
        summary: summarize(result),
      });
    }),
  );

  const checks = {
    uptime: results.get('uptime')!,
    ssl: results.get('ssl')!,
    httpsEnforced: results.get('httpsEnforced')!,
    domain: results.get('domain')!,
    crawl: results.get('crawl')!,
    pagespeed: skipped('pagespeed'),
    safebrowsing: skipped('safebrowsing'),
    localVisibility: skipped('localVisibility'),
    napConsistency: skipped('napConsistency'),
  } as ScanResult['checks'];

  void DEFERRED;
  const scores = scoreScan(checks);
  return {
    type: 'done',
    grade: scores.grade,
    composite: scores.composite,
    categories: scores.categories,
    measuredCount: scores.categories.filter((c) => c.score !== null).length,
  };
}
