/**
 * Pure helpers over the businesses.services jsonb — the entitlement source of
 * truth. No I/O; safe to unit-test and to run anywhere.
 */
export type ServiceKey = 'sitevitals' | 'website' | 'callback' | 'reviews' | 'social';

export type EntitlementStatus =
  | 'incomplete'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled';

export interface ServiceEntitlement {
  status?: EntitlementStatus;
  plan?: string;
  stripe_subscription_id?: string;
  current_period_end?: string;
}

export type Services = Record<string, ServiceEntitlement>;

/** Merge a patch onto one service, returning a NEW services object. */
export function setServiceStatus(
  services: Services | null | undefined,
  key: ServiceKey,
  patch: ServiceEntitlement,
): Services {
  const base = services ?? {};
  return { ...base, [key]: { ...(base[key] ?? {}), ...patch } };
}

/** A service is entitled (module visible) while trialing or active. */
export function isEntitled(services: Services | null | undefined, key: ServiceKey): boolean {
  const status = services?.[key]?.status;
  return status === 'trialing' || status === 'active';
}

const ACTIVE_STATUSES = new Set(['trialing', 'active']);

/** Maps to the legacy businesses.active flag the worker gates on. */
export function statusIsActive(stripeStatus: string | undefined): boolean {
  return !!stripeStatus && ACTIVE_STATUSES.has(stripeStatus);
}
