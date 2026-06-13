import type { Check, UptimeRaw } from '../types.js';
import { followRedirects, normalizeUrl } from '../util/http.js';
import { runSafely } from '../util/run-safely.js';

export const uptimeCheck: Check<UptimeRaw> = {
  type: 'uptime',
  run: (target) =>
    runSafely('uptime', async () => {
      const url = normalizeUrl(target.url);
      const started = Date.now();
      const { hops, finalUrl, status, response } = await followRedirects(url);
      const responseTimeMs = Date.now() - started;
      await response.body?.cancel();
      return {
        finalUrl,
        statusCode: status,
        responseTimeMs,
        redirects: hops,
        up: status < 400,
      };
    }),
};
