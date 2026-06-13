import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * Sync Stripe subscription state onto the business row (plan, status, ids) so
 * the worker and dashboard reflect billing. Requires STRIPE_WEBHOOK_SECRET and
 * the Supabase service-role key.
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

  const setBusiness = async (businessId: string, fields: Record<string, unknown>) => {
    await admin.from('businesses').update(fields).eq('id', businessId);
  };

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    const businessId = s.metadata?.business_id ?? s.client_reference_id;
    if (businessId) {
      await setBusiness(businessId, {
        stripe_customer_id: s.customer,
        stripe_subscription_id: s.subscription,
        subscription_status: 'trialing',
        plan: s.metadata?.plan ?? 'solo',
        active: true,
      });
    }
  } else if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const businessId = sub.metadata?.business_id;
    if (businessId) {
      const active = sub.status === 'active' || sub.status === 'trialing';
      await setBusiness(businessId, {
        subscription_status: sub.status,
        active,
      });
    }
  }

  return NextResponse.json({ received: true });
}
