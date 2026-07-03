import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, processEvent, applyOutcome, type DbClient } from '@platform/core/billing';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook — the ONLY writer of entitlements. Verifies the signature,
 * dedupes via the stripe_events ledger (Stripe delivers at-least-once), then
 * dual-writes businesses.services.sitevitals (truth) + legacy active columns
 * (worker bridge). All translation is in @platform/core/billing.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = createAdminClient();
  if (!stripe || !secret || !admin) {
    return NextResponse.json({ error: 'billing not configured' }, { status: 503 });
  }

  const body = await request.text();
  const sig = headers().get('stripe-signature');
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, secret);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  // Idempotency: insert the event id; an ignored duplicate means we've seen it.
  const { data: inserted, error: ledgerErr } = await admin
    .from('stripe_events')
    .upsert({ id: event.id, type: event.type }, { onConflict: 'id', ignoreDuplicates: true })
    .select('id');
  if (ledgerErr) {
    return NextResponse.json({ error: 'ledger write failed' }, { status: 500 });
  }
  if (!inserted || inserted.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Cast across the package boundary: web + core each bundle their own
  // supabase-js, so the client is passed via core's structural DbClient.
  const result = await applyOutcome(admin as unknown as DbClient, processEvent(event));
  return NextResponse.json({ received: true, ...result });
}
