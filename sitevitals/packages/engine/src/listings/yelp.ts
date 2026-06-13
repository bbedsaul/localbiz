import type { Listing } from '../types.js';
import { fetchWithTimeout } from '../util/http.js';
import { errorMessage } from '../util/http.js';
import { pickBestMatch, notFound, unavailable } from './match.js';

const ENDPOINT = 'https://api.yelp.com/v3/businesses/search';

interface YelpBusiness {
  name?: string;
  phone?: string;
  display_phone?: string;
  rating?: number;
  review_count?: number;
  url?: string;
  location?: { display_address?: string[] };
  attributes?: { business_url?: string };
}

export async function lookupYelp(
  name: string,
  city: string | undefined,
  domain: string,
): Promise<Listing> {
  const key = process.env.YELP_API_KEY;
  if (!key) return unavailable('yelp', 'YELP_API_KEY not set');
  if (!city) return unavailable('yelp', 'Yelp search requires a city (--city)');

  try {
    const params = new URLSearchParams({ term: name, location: city, limit: '5' });
    const response = await fetchWithTimeout(`${ENDPOINT}?${params}`, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      return unavailable('yelp', `Yelp Fusion API responded ${response.status}`);
    }
    const data = (await response.json()) as { businesses?: YelpBusiness[] };

    // Yelp search results don't expose the business website, so matching is
    // by name only; the threshold keeps us from grabbing a similarly-named shop.
    const business = pickBestMatch(
      (data.businesses ?? []).map((b) => ({ item: b, name: b.name ?? null, websiteHost: null })),
      name,
      domain,
    );
    if (!business) return notFound('yelp');

    return {
      source: 'yelp',
      found: true,
      name: business.name ?? null,
      address: business.location?.display_address?.join(', ') ?? null,
      phone: business.phone ?? business.display_phone ?? null,
      hours: null, // requires a per-business details call; not worth it for v1
      rating: business.rating ?? null,
      reviewCount: business.review_count ?? null,
      url: business.url ?? null,
    };
  } catch (err) {
    return unavailable('yelp', errorMessage(err));
  }
}
