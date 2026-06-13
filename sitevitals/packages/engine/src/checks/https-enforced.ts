import * as cheerio from 'cheerio';
import type { Check, HttpsEnforcedRaw } from '../types.js';
import { fetchWithTimeout, followRedirects, normalizeUrl } from '../util/http.js';
import { runSafely } from '../util/run-safely.js';

const MAX_SAMPLES = 10;

/** Resource URLs that load over http:// on an https page (passive or active mixed content). */
function findMixedContent(html: string): string[] {
  const $ = cheerio.load(html);
  const selectors = [
    'script[src]',
    'img[src]',
    'iframe[src]',
    'video[src]',
    'audio[src]',
    'source[src]',
    'embed[src]',
    'object[data]',
    'link[rel="stylesheet"][href]',
  ];
  const insecure: string[] = [];
  $(selectors.join(', ')).each((_i, el) => {
    const value = $(el).attr('src') ?? $(el).attr('data') ?? $(el).attr('href');
    if (value && /^http:\/\//i.test(value)) insecure.push(value);
  });
  return insecure;
}

export const httpsEnforcedCheck: Check<HttpsEnforcedRaw> = {
  type: 'httpsEnforced',
  run: (target) =>
    runSafely('httpsEnforced', async () => {
      const parsed = new URL(normalizeUrl(target.url));

      const raw: HttpsEnforcedRaw = {
        httpsSupported: false,
        httpRedirectsToHttps: false,
        finalUrl: null,
        mixedContentCount: 0,
        mixedContentSamples: [],
      };

      // 1. Does plain http:// end up on https:// ?
      const httpUrl = new URL(parsed.toString());
      httpUrl.protocol = 'http:';
      try {
        const trace = await followRedirects(httpUrl.toString());
        raw.finalUrl = trace.finalUrl;
        raw.httpRedirectsToHttps = trace.finalUrl.startsWith('https://');
        await trace.response.body?.cancel();
      } catch {
        // No http listener at all still counts as enforced, as long as https works below.
        raw.httpRedirectsToHttps = true;
      }

      // 2. Does https work, and is the homepage free of mixed content?
      const httpsUrl = new URL(parsed.toString());
      httpsUrl.protocol = 'https:';
      const response = await fetchWithTimeout(httpsUrl.toString());
      raw.httpsSupported = response.ok || (response.status >= 300 && response.status < 500);
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('text/html')) {
        const insecure = findMixedContent(await response.text());
        raw.mixedContentCount = insecure.length;
        raw.mixedContentSamples = insecure.slice(0, MAX_SAMPLES);
      } else {
        await response.body?.cancel();
      }

      // If https itself is down, "http didn't answer" is an outage, not enforcement.
      if (!raw.httpsSupported) raw.httpRedirectsToHttps = false;

      return raw;
    }),
};
