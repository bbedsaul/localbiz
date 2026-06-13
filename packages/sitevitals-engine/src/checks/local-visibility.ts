import { createSerpProvider } from '../providers/serp.js';
import type { Check, KeywordRank, LocalVisibilityRaw } from '../types.js';
import { normalizeUrl } from '../util/http.js';
import { runSafely, SkipCheck } from '../util/run-safely.js';

const MAX_KEYWORDS = 5;

export const localVisibilityCheck: Check<LocalVisibilityRaw> = {
  type: 'localVisibility',
  run: (target) =>
    runSafely('localVisibility', async () => {
      const keywords = (target.keywords ?? [])
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, MAX_KEYWORDS);
      if (keywords.length === 0) {
        throw new SkipCheck('no keywords to track (pass --keywords or --category + --city)');
      }

      const provider = createSerpProvider();
      if (!provider) {
        throw new SkipCheck(
          'no SERP provider configured (set DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD, or SERP_PROVIDER=serpapi with SERPAPI_KEY)',
        );
      }

      const domain = new URL(normalizeUrl(target.url)).hostname.replace(/^www\./i, '');
      // DataForSEO wants canonical location names; a bare city falls back to
      // country-level inside the provider. Pass full names via --city
      // ("Austin,Texas,United States") for true local rankings.
      const location = target.city ?? 'United States';

      const rankings: KeywordRank[] = await Promise.all(
        keywords.map(async (keyword) => {
          const { position, mapPack, topCompetitors } = await provider.rank(
            keyword,
            domain,
            location,
          );
          return { keyword, position, mapPack, topCompetitors };
        }),
      );

      return {
        provider: provider.name,
        location,
        rankings,
        inMapPack: rankings.some((r) => r.mapPack),
        serpCostUsd: provider.costUsd(),
      };
    }),
};
