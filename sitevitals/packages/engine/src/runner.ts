import {
  crawlCheck,
  domainCheck,
  httpsEnforcedCheck,
  pagespeedCheck,
  safebrowsingCheck,
  sslCheck,
  uptimeCheck,
} from './checks/index.js';
import { scoreScan } from './scoring.js';
import type { CheckResult, CheckTarget, CheckType, ScanResult } from './types.js';
import { errorMessage, normalizeUrl } from './util/http.js';

export const ENGINE_VERSION = '0.1.0';

function failureResult(type: CheckType, reason: unknown): CheckResult<never> {
  return {
    type,
    status: 'error',
    ranAt: new Date().toISOString(),
    durationMs: 0,
    raw: null,
    error: errorMessage(reason),
  };
}

function unwrap<Raw>(
  type: CheckType,
  settled: PromiseSettledResult<CheckResult<Raw>>,
): CheckResult<Raw> {
  // Checks catch their own failures via runSafely; this guards against bugs in
  // the checks themselves so a scan still always produces a ScanResult.
  return settled.status === 'fulfilled' ? settled.value : failureResult(type, settled.reason);
}

export async function runScan(target: CheckTarget): Promise<ScanResult> {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const url = normalizeUrl(target.url);
  const resolvedTarget: CheckTarget = { ...target, url };

  const [uptime, ssl, domain, crawl, pagespeed, safebrowsing, httpsEnforced] =
    await Promise.allSettled([
      uptimeCheck.run(resolvedTarget),
      sslCheck.run(resolvedTarget),
      domainCheck.run(resolvedTarget),
      crawlCheck.run(resolvedTarget),
      pagespeedCheck.run(resolvedTarget),
      safebrowsingCheck.run(resolvedTarget),
      httpsEnforcedCheck.run(resolvedTarget),
    ]);

  const checks: ScanResult['checks'] = {
    uptime: unwrap('uptime', uptime),
    ssl: unwrap('ssl', ssl),
    domain: unwrap('domain', domain),
    crawl: unwrap('crawl', crawl),
    pagespeed: unwrap('pagespeed', pagespeed),
    safebrowsing: unwrap('safebrowsing', safebrowsing),
    httpsEnforced: unwrap('httpsEnforced', httpsEnforced),
  };

  return {
    engineVersion: ENGINE_VERSION,
    url,
    category: target.category,
    city: target.city,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    checks,
    scores: scoreScan(checks),
  };
}
