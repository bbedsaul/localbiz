import type { Listing } from '../types.js';
import { fetchWithTimeout } from '../util/http.js';
import { errorMessage } from '../util/http.js';
import { pickBestMatch, notFound, unavailable } from './match.js';

const GRAPH_VERSION = 'v19.0';

interface FbPage {
  id?: string;
  name?: string;
  link?: string;
  website?: string;
  phone?: string;
  single_line_address?: string;
  overall_star_rating?: number;
  rating_count?: number;
}

/**
 * Facebook page lookup via the Graph API pages/search endpoint. Requires an
 * app access token with Pages public data access — frequently unavailable, so
 * every failure degrades to 'unavailable' rather than erroring the check.
 */
export async function lookupFacebook(
  name: string,
  city: string | undefined,
  domain: string,
): Promise<Listing> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!token) return unavailable('facebook', 'FACEBOOK_ACCESS_TOKEN not set');

  try {
    const params = new URLSearchParams({
      q: city ? `${name} ${city}` : name,
      fields: 'id,name,link,website,phone,single_line_address,overall_star_rating,rating_count',
      access_token: token,
    });
    const response = await fetchWithTimeout(
      `https://graph.facebook.com/${GRAPH_VERSION}/pages/search?${params}`,
    );
    if (!response.ok) {
      return unavailable('facebook', `Graph API responded ${response.status}`);
    }
    const data = (await response.json()) as { data?: FbPage[] };

    const page = pickBestMatch(
      (data.data ?? []).map((p) => ({
        item: p,
        name: p.name ?? null,
        websiteHost: safeHost(p.website),
      })),
      name,
      domain,
    );
    if (!page) return notFound('facebook');

    return {
      source: 'facebook',
      found: true,
      name: page.name ?? null,
      address: page.single_line_address ?? null,
      phone: page.phone ?? null,
      hours: null, // page hours need a per-page fields query; v1 skips it
      rating: page.overall_star_rating ?? null,
      reviewCount: page.rating_count ?? null,
      url: page.link ?? null,
    };
  } catch (err) {
    return unavailable('facebook', errorMessage(err));
  }
}

function safeHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname;
  } catch {
    return null;
  }
}
