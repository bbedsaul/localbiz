import type { Listing, ListingSource } from '../types.js';
import { namesMatch } from '../util/nap.js';

export function unavailable(source: ListingSource, reason: string): Listing {
  return {
    source,
    found: false,
    unavailableReason: reason,
    name: null,
    address: null,
    phone: null,
    hours: null,
    rating: null,
    reviewCount: null,
    url: null,
  };
}

export function notFound(source: ListingSource): Listing {
  return {
    source,
    found: false,
    name: null,
    address: null,
    phone: null,
    hours: null,
    rating: null,
    reviewCount: null,
    url: null,
  };
}

export interface Candidate<T> {
  item: T;
  name: string | null;
  websiteHost: string | null;
}

/**
 * Pick the search result that is most plausibly this business: a result whose
 * website matches the target domain wins outright; otherwise the best fuzzy
 * name match (≥ threshold). Returns null when nothing is confident enough —
 * a wrong listing is worse than no listing.
 */
export function pickBestMatch<T>(
  candidates: Candidate<T>[],
  targetName: string,
  targetDomain: string,
): T | null {
  const strip = (h: string): string => h.toLowerCase().replace(/^www\./, '');
  const domain = strip(targetDomain);

  const byDomain = candidates.find((c) => c.websiteHost && strip(c.websiteHost) === domain);
  if (byDomain) return byDomain.item;

  const byName = candidates.find((c) => c.name && namesMatch(c.name, targetName));
  return byName ? byName.item : null;
}
