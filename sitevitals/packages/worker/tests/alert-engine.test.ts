import { describe, expect, it, vi } from 'vitest';
import { AlertEngine, type AlertNotifier, type AlertStore } from '../src/alerts/engine.js';
import { DefaultAlertNotifier } from '../src/alerts/notify.js';
import type { AlertEvaluation } from '../src/alerts/rules.js';
import type { AlertRow, AlertType, BusinessRow } from '../src/db/types.js';
import { logger } from '../src/logger.js';

function business(overrides: Partial<BusinessRow> = {}): BusinessRow {
  return {
    id: 'biz-1',
    name: "Joe's HVAC",
    url: 'https://joes-hvac.com',
    category: 'hvac',
    city: 'Austin',
    gbp_id: null,
    yelp_id: null,
    fb_id: null,
    plan: 'solo',
    owner_user_id: null,
    owner_email: 'joe@example.com',
    phone: null,
    active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const downEval: AlertEvaluation = {
  type: 'site_down',
  triggered: true,
  message: 'site is down',
};
const clearEval: AlertEvaluation = { type: 'site_down', triggered: false, message: '' };

class FakeStore implements AlertStore {
  alerts: AlertRow[] = [];
  private seq = 0;

  async findOpenAlert(businessId: string, type: AlertType): Promise<AlertRow | null> {
    return (
      this.alerts.find(
        (a) => a.business_id === businessId && a.type === type && a.resolved_at === null,
      ) ?? null
    );
  }
  async createAlert(businessId: string, type: AlertType, message: string): Promise<AlertRow> {
    const row: AlertRow = {
      id: `alert-${++this.seq}`,
      business_id: businessId,
      type,
      message,
      triggered_at: new Date().toISOString(),
      resolved_at: null,
      notified_via: [],
      last_notified_at: null,
    };
    this.alerts.push(row);
    return row;
  }
  async markAlertNotified(id: string, via: string[], at: Date): Promise<void> {
    const row = this.alerts.find((a) => a.id === id)!;
    row.notified_via = via;
    row.last_notified_at = at.toISOString();
  }
  async resolveAlert(id: string, at: Date): Promise<void> {
    this.alerts.find((a) => a.id === id)!.resolved_at = at.toISOString();
  }
}

function fakeNotifier(): AlertNotifier & { calls: { kind: string }[] } {
  const calls: { kind: string }[] = [];
  return {
    calls,
    async notify(_b, _e, kind) {
      calls.push({ kind });
      return ['email'];
    },
  };
}

describe('AlertEngine', () => {
  it('opens an alert and notifies on first trigger', async () => {
    const store = new FakeStore();
    const notifier = fakeNotifier();
    const engine = new AlertEngine(store, notifier);

    expect(await engine.process(business(), downEval)).toBe('opened');
    expect(store.alerts).toHaveLength(1);
    expect(store.alerts[0]?.last_notified_at).not.toBeNull();
    expect(notifier.calls).toEqual([{ kind: 'triggered' }]);
  });

  it('dedupes: repeated triggers reuse the open alert and throttle notifications', async () => {
    const store = new FakeStore();
    const notifier = fakeNotifier();
    let nowMs = Date.parse('2026-06-12T00:00:00Z');
    const engine = new AlertEngine(store, notifier, () => new Date(nowMs));

    await engine.process(business(), downEval);
    nowMs += 5 * 60 * 1000; // 5 min later — still throttled
    expect(await engine.process(business(), downEval)).toBe('unchanged');
    nowMs += 12 * 60 * 60 * 1000; // 12h — still inside 24h window
    expect(await engine.process(business(), downEval)).toBe('unchanged');

    expect(store.alerts).toHaveLength(1);
    expect(notifier.calls).toHaveLength(1);
  });

  it('re-notifies after the 24h throttle window', async () => {
    const store = new FakeStore();
    const notifier = fakeNotifier();
    let nowMs = Date.parse('2026-06-12T00:00:00Z');
    const engine = new AlertEngine(store, notifier, () => new Date(nowMs));

    await engine.process(business(), downEval);
    nowMs += 25 * 60 * 60 * 1000; // 25h later
    expect(await engine.process(business(), downEval)).toBe('renotified');
    expect(store.alerts).toHaveLength(1); // still the same alert
    expect(notifier.calls).toHaveLength(2);
  });

  it('auto-resolves when the condition clears and sends one recovery notice', async () => {
    const store = new FakeStore();
    const notifier = fakeNotifier();
    const engine = new AlertEngine(store, notifier);

    await engine.process(business(), downEval);
    expect(await engine.process(business(), clearEval)).toBe('resolved');
    expect(store.alerts[0]?.resolved_at).not.toBeNull();
    expect(notifier.calls).toEqual([{ kind: 'triggered' }, { kind: 'resolved' }]);

    // Further clear evaluations are no-ops.
    expect(await engine.process(business(), clearEval)).toBe('unchanged');
    expect(notifier.calls).toHaveLength(2);
  });

  it('a new outage after resolution opens a fresh alert', async () => {
    const store = new FakeStore();
    const engine = new AlertEngine(store, fakeNotifier());

    await engine.process(business(), downEval);
    await engine.process(business(), clearEval);
    expect(await engine.process(business(), downEval)).toBe('opened');
    expect(store.alerts).toHaveLength(2);
  });
});

describe('DefaultAlertNotifier channel gating', () => {
  function emailProvider() {
    const send = vi.fn(async () => ({ id: 'em_1' }));
    return { name: 'resend', send };
  }
  function smsProvider() {
    const send = vi.fn(async () => undefined);
    return { name: 'twilio', send };
  }

  it('emails always; SMS only for pro plan with a phone', async () => {
    const email = emailProvider();
    const sms = smsProvider();
    const notifier = new DefaultAlertNotifier(email, sms, logger);

    const channels = await notifier.notify(
      business({ plan: 'pro', phone: '+15125551234' }),
      downEval,
      'triggered',
    );
    expect(channels).toEqual(['email', 'sms']);

    const soloChannels = await notifier.notify(
      business({ plan: 'solo', phone: '+15125551234' }),
      downEval,
      'triggered',
    );
    expect(soloChannels).toEqual(['email']);

    const noPhoneChannels = await notifier.notify(business({ plan: 'pro' }), downEval, 'triggered');
    expect(noPhoneChannels).toEqual(['email']);
  });

  it('never sends SMS for resolution notices', async () => {
    const sms = smsProvider();
    const notifier = new DefaultAlertNotifier(emailProvider(), sms, logger);
    const channels = await notifier.notify(
      business({ plan: 'pro', phone: '+15125551234' }),
      downEval,
      'resolved',
    );
    expect(channels).toEqual(['email']);
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('survives a failing channel and reports the ones that worked', async () => {
    const email = { name: 'resend', send: vi.fn(async () => Promise.reject(new Error('boom'))) };
    const sms = smsProvider();
    const notifier = new DefaultAlertNotifier(email, sms, logger);
    const channels = await notifier.notify(
      business({ plan: 'pro', phone: '+15125551234' }),
      downEval,
      'triggered',
    );
    expect(channels).toEqual(['sms']);
  });

  it('routes to the override address when configured', async () => {
    const email = emailProvider();
    const notifier = new DefaultAlertNotifier(email, null, logger, {
      overrideTo: 'staging@sitevitals.dev',
    });
    await notifier.notify(business(), downEval, 'triggered');
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'staging@sitevitals.dev' }),
    );
  });
});
