export type PlanId = 'solo' | 'pro';
export type Interval = 'monthly' | 'annual';

export const PLANS: Record<PlanId, { label: string; monthly: number }> = {
  solo: { label: 'Solo', monthly: 29 },
  pro: { label: 'Pro', monthly: 49 },
};

/** Annual = 10× monthly (two months free). */
export function annualAmount(monthlyDollars: number): number {
  return monthlyDollars * 10;
}

/** unit_amount in cents for a given plan+interval. */
export function unitAmountCents(plan: PlanId, interval: Interval): number {
  const monthly = PLANS[plan].monthly;
  return (interval === 'annual' ? annualAmount(monthly) : monthly) * 100;
}

/** Stable Stripe price lookup_key — also the primary key in billing_prices. */
export function lookupKey(plan: PlanId, interval: Interval): string {
  return `sitevitals_${plan}_${interval}`;
}

/** Every price we manage: Solo/Pro × monthly/annual. */
export const PRICE_MATRIX: { plan: PlanId; interval: Interval }[] = [
  { plan: 'solo', interval: 'monthly' },
  { plan: 'solo', interval: 'annual' },
  { plan: 'pro', interval: 'monthly' },
  { plan: 'pro', interval: 'annual' },
];

/** Minimal shape of a Supabase-ish client — avoids a hard supabase-js dep here. */
interface QueryClient {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): { maybeSingle(): Promise<{ data: { stripe_price_id?: string } | null }> };
    };
  };
}

/**
 * Resolve a Stripe price id from the billing_prices config table, falling back
 * to legacy env vars (STRIPE_PRICE_SOLO / STRIPE_PRICE_PRO) for monthly plans.
 *
 * `client` is typed `unknown` so any supabase-js version (web's or a script's)
 * can be passed without a cross-package generic clash; cast to the minimal shape
 * we use internally.
 */
export async function getPriceId(
  client: unknown,
  plan: PlanId,
  interval: Interval = 'monthly',
): Promise<string | undefined> {
  try {
    const { data } = await (client as QueryClient)
      .from('billing_prices')
      .select('stripe_price_id')
      .eq('lookup_key', lookupKey(plan, interval))
      .maybeSingle();
    if (data?.stripe_price_id) return data.stripe_price_id;
  } catch {
    /* table missing / not configured → fall through to env */
  }
  if (interval === 'monthly') {
    return plan === 'pro' ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_SOLO;
  }
  return undefined;
}
