import type Stripe from 'stripe';
import { statusIsActive, type EntitlementStatus } from './entitlements.js';

/** How the route should locate the business for this event. */
export interface BusinessLookup {
  businessId?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export interface WebhookOutcome {
  lookup: BusinessLookup;
  /** Patch merged into businesses.services.sitevitals (the source of truth). */
  entitlement: {
    status: EntitlementStatus;
    plan?: string;
    stripe_subscription_id?: string;
    current_period_end?: string;
  };
  /** Legacy flat columns kept in sync for the SiteVitals worker (gates on `active`). */
  legacy: {
    subscription_status: string;
    active: boolean;
    plan?: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
  };
  /** True for event types we acknowledge but don't act on. */
  ignore?: boolean;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** Map a Stripe subscription status to our entitlement status. */
function mapStatus(s: Stripe.Subscription.Status): EntitlementStatus {
  switch (s) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return 'past_due';
    case 'incomplete':
      return 'incomplete';
    default: // canceled, incomplete_expired
      return 'canceled';
  }
}

/**
 * Pure translation of a Stripe event into the DB patches the webhook route
 * applies. No I/O — unit-testable with fixture events. THE RULE: entitlements
 * change only through this path (webhook), never from UI writes.
 */
export function processEvent(event: Stripe.Event): WebhookOutcome {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const plan = s.metadata?.plan;
      const subId = str(s.subscription);
      const custId = str(s.customer);
      return {
        lookup: {
          businessId: s.metadata?.business_id ?? str(s.client_reference_id),
          stripeSubscriptionId: subId,
          stripeCustomerId: custId,
        },
        entitlement: { status: 'trialing', plan, stripe_subscription_id: subId },
        legacy: {
          subscription_status: 'trialing',
          active: true,
          plan,
          stripe_customer_id: custId,
          stripe_subscription_id: subId,
        },
      };
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const plan = sub.metadata?.plan;
      const cpe = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : undefined;
      const status = mapStatus(sub.status);
      return {
        lookup: {
          businessId: sub.metadata?.business_id,
          stripeSubscriptionId: sub.id,
          stripeCustomerId: str(sub.customer),
        },
        entitlement: { status, plan, stripe_subscription_id: sub.id, current_period_end: cpe },
        legacy: { subscription_status: sub.status, active: statusIsActive(sub.status), plan },
      };
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      return {
        lookup: {
          stripeSubscriptionId: str(inv.subscription),
          stripeCustomerId: str(inv.customer),
        },
        entitlement: { status: 'past_due' },
        legacy: { subscription_status: 'past_due', active: false },
      };
    }

    default:
      return {
        lookup: {},
        entitlement: { status: 'incomplete' },
        legacy: { subscription_status: '', active: false },
        ignore: true,
      };
  }
}
