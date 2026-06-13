import type { SerpProvider, SerpRank } from './serp.js';

/**
 * Stub fallback vendor. Same interface as DataForSeoProvider so swapping is a
 * one-line env change (SERP_PROVIDER=serpapi) once implemented.
 */
export class SerpApiProvider implements SerpProvider {
  readonly name = 'serpapi';

  constructor(private readonly apiKey: string) {
    void this.apiKey;
  }

  costUsd(): number | null {
    return null;
  }

  rank(_keyword: string, _domain: string, _location: string): Promise<SerpRank> {
    return Promise.reject(
      new Error('SerpApiProvider is not implemented yet — set SERP_PROVIDER=dataforseo'),
    );
  }
}
