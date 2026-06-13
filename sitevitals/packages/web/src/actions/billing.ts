'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStripe, priceIdFor, type PlanId } from '@/lib/stripe';

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? `https://${headers().get('host')}`;
}

/**
 * Start a 14-day-trial subscription checkout (card required). Returns a URL to
 * redirect to, or null when Stripe isn't configured (dev → skip straight to
 * the dashboard).
 */
export async function createCheckout(
  businessId: string,
  plan: PlanId,
): Promise<{ url: string | null; error?: string }> {
  const stripe = getStripe();
  const price = priceIdFor(plan);
  if (!stripe || !price) return { url: null };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { url: null, error: 'Not signed in.' };

  const origin = appOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    payment_method_collection: 'always', // card required even during trial
    client_reference_id: businessId,
    metadata: { business_id: businessId, plan },
    success_url: `${origin}/dashboard?welcome=1`,
    cancel_url: `${origin}/dashboard`,
    allow_promotion_codes: true,
  });
  return { url: session.url };
}

/** Stripe customer portal for managing the subscription / card / cancellation. */
export async function createPortal(businessId: string): Promise<{ url: string | null }> {
  const stripe = getStripe();
  if (!stripe) return { url: null };

  const supabase = createClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_customer_id')
    .eq('id', businessId)
    .maybeSingle();

  const customerId = (business as { stripe_customer_id?: string } | null)?.stripe_customer_id;
  if (!customerId) return { url: null };

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appOrigin()}/dashboard/billing`,
  });
  return { url: session.url };
}
