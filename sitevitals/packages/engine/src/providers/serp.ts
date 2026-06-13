import { DataForSeoProvider } from './dataforseo.js';
import { SerpApiProvider } from './serpapi.js';

export interface SerpRank {
  /** Organic position of `domain`, null when not in the top 50. */
  position: number | null;
  /** Whether `domain` appears in the local map pack. */
  mapPack: boolean;
  /** Top organic competitor domains (excluding `domain`). */
  topCompetitors: string[];
}

export interface SerpProvider {
  readonly name: string;
  rank(keyword: string, domain: string, location: string): Promise<SerpRank>;
  /** Cumulative vendor-reported spend in USD since construction, null if unknown. */
  costUsd(): number | null;
}

/**
 * Build the provider selected by SERP_PROVIDER (default: dataforseo).
 * Returns null when the chosen provider's credentials are missing, so the
 * localVisibility check can skip instead of erroring.
 */
export function createSerpProvider(
  env: Record<string, string | undefined> = process.env,
): SerpProvider | null {
  const choice = (env.SERP_PROVIDER ?? 'dataforseo').toLowerCase();
  switch (choice) {
    case 'serpapi':
      return env.SERPAPI_KEY ? new SerpApiProvider(env.SERPAPI_KEY) : null;
    case 'dataforseo':
      return env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD
        ? new DataForSeoProvider(env.DATAFORSEO_LOGIN, env.DATAFORSEO_PASSWORD)
        : null;
    default:
      throw new Error(`Unknown SERP_PROVIDER "${choice}" (expected dataforseo or serpapi)`);
  }
}
