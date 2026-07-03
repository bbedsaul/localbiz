// @platform/core/billing — Stripe client, price catalog, entitlement helpers,
// and the pure webhook translator. Web imports these; the webhook is the ONLY
// writer of entitlements.
export { getStripe } from './stripe.js';
export {
  PLANS,
  PRICE_MATRIX,
  annualAmount,
  unitAmountCents,
  lookupKey,
  getPriceId,
  type PlanId,
  type Interval,
} from './prices.js';
export {
  setServiceStatus,
  isEntitled,
  statusIsActive,
  type ServiceKey,
  type EntitlementStatus,
  type ServiceEntitlement,
  type Services,
} from './entitlements.js';
export { processEvent, type WebhookOutcome, type BusinessLookup } from './webhook.js';
export { applyOutcome, type ApplyResult, type DbClient } from './apply.js';
