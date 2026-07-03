import { setServiceStatus, type Services } from './entitlements.js';
import type { WebhookOutcome } from './webhook.js';

/**
 * Minimal structural shape of the Supabase query builder we use here. Typed
 * structurally (not as SupabaseClient) so a client from any supabase-js version
 * — web's or a script's — satisfies it without a cross-package type clash.
 */
export interface DbClient {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null }>;
      };
    };
    update(values: Record<string, unknown>): {
      eq(col: string, val: string): PromiseLike<unknown>;
    };
  };
}

export interface ApplyResult {
  applied: boolean;
  businessId?: string;
  reason?: string;
}

async function resolveBusinessId(client: DbClient, outcome: WebhookOutcome): Promise<string | undefined> {
  const { businessId, stripeSubscriptionId, stripeCustomerId } = outcome.lookup;
  if (businessId) return businessId;

  for (const [col, val] of [
    ['stripe_subscription_id', stripeSubscriptionId],
    ['stripe_customer_id', stripeCustomerId],
  ] as const) {
    if (!val) continue;
    const { data } = await client.from('businesses').select('id').eq(col, val).maybeSingle();
    if (data?.id) return data.id as string;
  }
  return undefined;
}

/**
 * Apply a processed webhook outcome to the DB with a service-role client:
 * resolve the business (by id → subscription id → customer id), then dual-write
 * businesses.services.sitevitals (source of truth) AND the legacy
 * active/subscription_status/plan columns (SiteVitals worker bridge).
 *
 * Shared by the webhook route and the replay script so the write path is
 * defined once.
 */
export async function applyOutcome(client: DbClient, outcome: WebhookOutcome): Promise<ApplyResult> {
  if (outcome.ignore) return { applied: false, reason: 'ignored' };

  const businessId = await resolveBusinessId(client, outcome);
  if (!businessId) return { applied: false, reason: 'business not found' };

  const { data: current } = await client
    .from('businesses')
    .select('services')
    .eq('id', businessId)
    .maybeSingle();

  const services = setServiceStatus(
    (current?.services as Services | undefined) ?? null,
    'sitevitals',
    outcome.entitlement,
  );

  const update: Record<string, unknown> = {
    services,
    subscription_status: outcome.legacy.subscription_status,
    active: outcome.legacy.active,
  };
  if (outcome.legacy.plan) update.plan = outcome.legacy.plan;
  if (outcome.legacy.stripe_customer_id) update.stripe_customer_id = outcome.legacy.stripe_customer_id;
  if (outcome.legacy.stripe_subscription_id)
    update.stripe_subscription_id = outcome.legacy.stripe_subscription_id;

  await client.from('businesses').update(update).eq('id', businessId);
  return { applied: true, businessId };
}
