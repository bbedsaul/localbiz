import type { Check, PagespeedRaw, PagespeedStrategyRaw } from '../types.js';
import { fetchWithTimeout, normalizeUrl } from '../util/http.js';
import { runSafely, SkipCheck } from '../util/run-safely.js';

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
// PSI runs a full Lighthouse pass server-side; 60s leaves headroom inside the 90s scan budget.
const PSI_TIMEOUT_MS = 60_000;

interface PsiAudit {
  numericValue?: number;
}

interface PsiResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } };
    audits?: Record<string, PsiAudit>;
  };
  loadingExperience?: {
    metrics?: Record<string, { percentile?: number }>;
  };
}

async function runStrategy(
  url: string,
  strategy: 'mobile' | 'desktop',
  key: string,
): Promise<PagespeedStrategyRaw> {
  const params = new URLSearchParams({ url, strategy, key, category: 'performance' });
  const response = await fetchWithTimeout(`${ENDPOINT}?${params}`, {}, PSI_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`PageSpeed Insights (${strategy}) responded ${response.status}`);
  }
  const data = (await response.json()) as PsiResponse;
  const audits = data.lighthouseResult?.audits ?? {};
  const score = data.lighthouseResult?.categories?.performance?.score;
  return {
    performanceScore: typeof score === 'number' ? Math.round(score * 100) : null,
    lcpMs: audits['largest-contentful-paint']?.numericValue ?? null,
    cls: audits['cumulative-layout-shift']?.numericValue ?? null,
    // INP is field data; prefer CrUX, fall back to the lab audit when present.
    inpMs:
      data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentile ??
      audits['interaction-to-next-paint']?.numericValue ??
      null,
    totalByteWeight: audits['total-byte-weight']?.numericValue ?? null,
  };
}

export const pagespeedCheck: Check<PagespeedRaw> = {
  type: 'pagespeed',
  run: (target) =>
    runSafely('pagespeed', async () => {
      const key = process.env.PAGESPEED_API_KEY ?? process.env.GOOGLE_API_KEY;
      if (!key) {
        throw new SkipCheck('PAGESPEED_API_KEY (or GOOGLE_API_KEY) not set');
      }
      const url = normalizeUrl(target.url);
      const [mobile, desktop] = await Promise.allSettled([
        runStrategy(url, 'mobile', key),
        runStrategy(url, 'desktop', key),
      ]);
      if (mobile.status === 'rejected' && desktop.status === 'rejected') {
        throw mobile.reason;
      }
      return {
        mobile: mobile.status === 'fulfilled' ? mobile.value : null,
        desktop: desktop.status === 'fulfilled' ? desktop.value : null,
      };
    }),
};
