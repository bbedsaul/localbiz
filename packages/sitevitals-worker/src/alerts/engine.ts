import type { AlertRow, AlertType, BusinessRow } from '../db/types.js';
import type { AlertEvaluation } from './rules.js';

/** Subset of Repo the engine needs — tests provide an in-memory fake. */
export interface AlertStore {
  findOpenAlert(businessId: string, type: AlertType): Promise<AlertRow | null>;
  createAlert(businessId: string, type: AlertType, message: string): Promise<AlertRow>;
  markAlertNotified(id: string, via: string[], at: Date): Promise<void>;
  resolveAlert(id: string, at: Date): Promise<void>;
}

export interface AlertNotifier {
  /** Returns the channels actually used (e.g. ['email','sms']). Must not throw. */
  notify(
    business: BusinessRow,
    evaluation: AlertEvaluation,
    kind: 'triggered' | 'resolved',
  ): Promise<string[]>;
}

export type AlertOutcome = 'opened' | 'renotified' | 'resolved' | 'unchanged';

export const NOTIFY_THROTTLE_MS = 24 * 60 * 60 * 1000;

/**
 * Dedupe + throttle + auto-resolve state machine.
 * - One open alert per (business, type) — re-triggers attach to the open row.
 * - While unresolved, at most one notification per 24h.
 * - When the condition clears, the alert resolves and a one-time recovery
 *   notification goes out.
 */
export class AlertEngine {
  constructor(
    private readonly store: AlertStore,
    private readonly notifier: AlertNotifier,
    private readonly now: () => Date = () => new Date(),
    private readonly throttleMs: number = NOTIFY_THROTTLE_MS,
  ) {}

  async process(business: BusinessRow, evaluation: AlertEvaluation): Promise<AlertOutcome> {
    const open = await this.store.findOpenAlert(business.id, evaluation.type);

    if (evaluation.triggered) {
      if (!open) {
        const alert = await this.store.createAlert(business.id, evaluation.type, evaluation.message);
        const via = await this.notifier.notify(business, evaluation, 'triggered');
        await this.store.markAlertNotified(alert.id, via, this.now());
        return 'opened';
      }
      const last = open.last_notified_at ? new Date(open.last_notified_at).getTime() : 0;
      if (this.now().getTime() - last >= this.throttleMs) {
        const via = await this.notifier.notify(business, evaluation, 'triggered');
        await this.store.markAlertNotified(
          open.id,
          [...new Set([...open.notified_via, ...via])],
          this.now(),
        );
        return 'renotified';
      }
      return 'unchanged';
    }

    if (open) {
      await this.store.resolveAlert(open.id, this.now());
      await this.notifier.notify(business, { ...evaluation, message: open.message }, 'resolved');
      return 'resolved';
    }
    return 'unchanged';
  }
}
