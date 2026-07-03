import Stripe from 'stripe';

let cached: Stripe | null = null;

/** Lazy Stripe client — returns null when STRIPE_SECRET_KEY isn't configured. */
export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Use the SDK's pinned default API version (avoids literal-version drift).
  cached = new Stripe(key);
  return cached;
}
