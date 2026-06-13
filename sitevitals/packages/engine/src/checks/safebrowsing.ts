import type { Check, SafeBrowsingRaw } from '../types.js';
import { fetchWithTimeout, normalizeUrl } from '../util/http.js';
import { runSafely, SkipCheck } from '../util/run-safely.js';

const ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

interface ThreatMatch {
  threatType?: string;
}

export const safebrowsingCheck: Check<SafeBrowsingRaw> = {
  type: 'safebrowsing',
  run: (target) =>
    runSafely('safebrowsing', async () => {
      const key = process.env.SAFE_BROWSING_API_KEY ?? process.env.GOOGLE_API_KEY;
      if (!key) {
        throw new SkipCheck('SAFE_BROWSING_API_KEY (or GOOGLE_API_KEY) not set');
      }
      const url = normalizeUrl(target.url);
      const response = await fetchWithTimeout(`${ENDPOINT}?key=${key}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'sitevitals', clientVersion: '0.1.0' },
          threatInfo: {
            threatTypes: [
              'MALWARE',
              'SOCIAL_ENGINEERING',
              'UNWANTED_SOFTWARE',
              'POTENTIALLY_HARMFUL_APPLICATION',
            ],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }],
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`Safe Browsing API responded ${response.status}`);
      }
      const data = (await response.json()) as { matches?: ThreatMatch[] };
      const threats = [
        ...new Set((data.matches ?? []).map((m) => m.threatType).filter((t): t is string => !!t)),
      ];
      return { flagged: threats.length > 0, threats };
    }),
};
