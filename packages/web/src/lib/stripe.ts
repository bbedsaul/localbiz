import Stripe from 'stripe';

export const PLANS = {
  solo: { label: 'Solo', price: 29, priceEnv: 'STRIPE_PRICE_SOLO' },
  pro: { label: 'Pro', price: 49, priceEnv: 'STRIPE_PRICE_PRO' },
} as const;

export type PlanId = keyof typeof PLANS;

let cached: Stripe | null = null;

/** Lazy Stripe client — returns null when STRIPE_SECRET_KEY isn't configured. */
export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Use the SDK's pinned default API version (avoids a literal-version mismatch
  // when the stripe package updates).
  cached = new Stripe(key);
  return cached;
}

export function priceIdFor(plan: PlanId): string | undefined {
  return process.env[PLANS[plan].priceEnv];
}
