import { describe, it, expect } from 'vitest';
import { processEvent } from '../src/billing/webhook.js';
import { applyOutcome, type DbClient } from '../src/billing/apply.js';
import { setServiceStatus, isEntitled } from '../src/billing/entitlements.js';

// Minimal Stripe.Event fixtures — processEvent only reads a few fields.
function evt(type: string, object: Record<string, unknown>) {
  return { type, data: { object } } as never;
}

describe('processEvent', () => {
  it('checkout.session.completed → trialing + active, resolves by business_id', () => {
    const out = processEvent(
      evt('checkout.session.completed', {
        metadata: { business_id: 'b1', plan: 'pro' },
        subscription: 'sub_1',
        customer: 'cus_1',
        client_reference_id: 'b1',
      }),
    );
    expect(out.lookup.businessId).toBe('b1');
    expect(out.entitlement).toMatchObject({ status: 'trialing', plan: 'pro', stripe_subscription_id: 'sub_1' });
    expect(out.legacy).toMatchObject({ subscription_status: 'trialing', active: true, plan: 'pro' });
  });

  it('customer.subscription.updated (active) → active, current_period_end mapped', () => {
    const out = processEvent(
      evt('customer.subscription.updated', {
        id: 'sub_1',
        status: 'active',
        metadata: { business_id: 'b1', plan: 'pro' },
        customer: 'cus_1',
        current_period_end: 1893456000, // 2030-01-01
      }),
    );
    expect(out.entitlement.status).toBe('active');
    expect(out.entitlement.current_period_end).toBe(new Date(1893456000 * 1000).toISOString());
    expect(out.legacy.active).toBe(true);
    expect(out.lookup.stripeSubscriptionId).toBe('sub_1');
  });

  it('customer.subscription.deleted (canceled) → canceled + inactive', () => {
    const out = processEvent(
      evt('customer.subscription.deleted', { id: 'sub_1', status: 'canceled', customer: 'cus_1' }),
    );
    expect(out.entitlement.status).toBe('canceled');
    expect(out.legacy).toMatchObject({ subscription_status: 'canceled', active: false });
  });

  it('invoice.payment_failed → past_due + inactive, resolves by subscription/customer', () => {
    const out = processEvent(
      evt('invoice.payment_failed', { subscription: 'sub_1', customer: 'cus_1' }),
    );
    expect(out.entitlement.status).toBe('past_due');
    expect(out.legacy.active).toBe(false);
    expect(out.lookup.stripeSubscriptionId).toBe('sub_1');
  });

  it('unknown event type is ignored', () => {
    expect(processEvent(evt('customer.created', {})).ignore).toBe(true);
  });
});

// In-memory DbClient mock implementing the structural shape applyOutcome uses.
function mockDb(rows: Record<string, Record<string, unknown>>): { client: DbClient; rows: typeof rows } {
  const list = () => Object.values(rows);
  const client: DbClient = {
    from() {
      return {
        select() {
          return {
            eq(col: string, val: string) {
              return {
                async maybeSingle() {
                  const found = list().find((r) => r[col] === val);
                  return { data: (found as Record<string, unknown>) ?? null };
                },
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          return {
            eq(col: string, val: string) {
              const found = list().find((r) => r[col] === val);
              if (found) Object.assign(found, values);
              return Promise.resolve(null);
            },
          };
        },
      };
    },
  };
  return { client, rows };
}

describe('applyOutcome (dual-write)', () => {
  it('flips services.sitevitals + legacy active on a trialing checkout', async () => {
    const { client, rows } = mockDb({
      b1: { id: 'b1', services: {}, active: false, subscription_status: null },
    });
    const res = await applyOutcome(
      client,
      processEvent(
        evt('checkout.session.completed', {
          metadata: { business_id: 'b1', plan: 'solo' },
          subscription: 'sub_1',
          customer: 'cus_1',
        }),
      ),
    );
    expect(res.applied).toBe(true);
    expect(isEntitled(rows.b1.services as never, 'sitevitals')).toBe(true);
    expect((rows.b1.services as Record<string, { status?: string }>).sitevitals.status).toBe('trialing');
    expect(rows.b1.active).toBe(true);
    expect(rows.b1.stripe_subscription_id).toBe('sub_1');
  });

  it('resolves the business by stripe_subscription_id and cancels it', async () => {
    const { client, rows } = mockDb({
      b1: {
        id: 'b1',
        services: setServiceStatus(null, 'sitevitals', { status: 'active' }),
        active: true,
        stripe_subscription_id: 'sub_9',
      },
    });
    const res = await applyOutcome(
      client,
      processEvent(evt('customer.subscription.deleted', { id: 'sub_9', status: 'canceled' })),
    );
    expect(res.applied).toBe(true);
    expect(res.businessId).toBe('b1');
    expect(rows.b1.active).toBe(false);
    expect(isEntitled(rows.b1.services as never, 'sitevitals')).toBe(false);
  });

  it('no-ops when the business cannot be found', async () => {
    const { client } = mockDb({});
    const res = await applyOutcome(
      client,
      processEvent(evt('invoice.payment_failed', { subscription: 'sub_x' })),
    );
    expect(res.applied).toBe(false);
    expect(res.reason).toBe('business not found');
  });
});
