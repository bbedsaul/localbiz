import { NextRequest, NextResponse } from 'next/server';
import { napConsistencyCheck, suggestKeywords } from '@sitevitals/engine';
import { normalizeUrl } from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Onboarding auto-discovery: find the business's Google / Yelp / Facebook
 * listings and suggest local keywords. Listing lookups need API keys; when
 * they're absent each platform comes back `unavailable` and the UI falls back
 * to manual confirmation.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    url?: string;
    name?: string;
    category?: string;
    city?: string;
  };
  if (!body.url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }
  const url = normalizeUrl(body.url);

  const keywords =
    body.category && body.city ? suggestKeywords(body.category, body.city) : [];

  const result = await napConsistencyCheck.run({
    url,
    name: body.name,
    category: body.category,
    city: body.city,
  });

  const listings =
    result.status === 'ok' && result.raw
      ? result.raw.listings.map((l) => ({
          source: l.source,
          found: l.found,
          name: l.name,
          address: l.address,
          phone: l.phone,
          unavailable: Boolean(l.unavailableReason),
        }))
      : [];

  return NextResponse.json({ listings, keywords });
}
