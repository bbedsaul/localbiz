import type { Listing } from '../types.js';
import { fetchWithTimeout } from '../util/http.js';
import { errorMessage } from '../util/http.js';
import { pickBestMatch, notFound, unavailable } from './match.js';

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
].join(',');

interface Place {
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
}

function host(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export async function lookupGoogleBusiness(
  name: string,
  city: string | undefined,
  domain: string,
): Promise<Listing> {
  const key = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!key) return unavailable('google', 'GOOGLE_PLACES_API_KEY (or GOOGLE_API_KEY) not set');

  try {
    const response = await fetchWithTimeout(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: city ? `${name} ${city}` : name, pageSize: 5 }),
    });
    if (!response.ok) {
      return unavailable('google', `Places API responded ${response.status}`);
    }
    const data = (await response.json()) as { places?: Place[] };

    const place = pickBestMatch(
      (data.places ?? []).map((p) => ({
        item: p,
        name: p.displayName?.text ?? null,
        websiteHost: host(p.websiteUri),
      })),
      name,
      domain,
    );
    if (!place) return notFound('google');

    return {
      source: 'google',
      found: true,
      name: place.displayName?.text ?? null,
      address: place.formattedAddress ?? null,
      phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
      hours: place.regularOpeningHours?.weekdayDescriptions ?? null,
      rating: place.rating ?? null,
      reviewCount: place.userRatingCount ?? null,
      url: place.websiteUri ?? null,
    };
  } catch (err) {
    return unavailable('google', errorMessage(err));
  }
}
