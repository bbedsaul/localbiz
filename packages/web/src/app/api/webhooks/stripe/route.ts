import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Retired in W2. The Stripe webhook now lives at /api/stripe/webhook (idempotent,
 * entitlements source of truth). Update the endpoint URL in the Stripe dashboard.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'gone', moved_to: '/api/stripe/webhook' },
    { status: 410 },
  );
}
