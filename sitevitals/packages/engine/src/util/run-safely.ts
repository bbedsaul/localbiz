import type { CheckResult, CheckType } from '../types.js';
import { errorMessage } from './http.js';

/** Throw inside a check body to mark it 'skipped' instead of 'error'. */
export class SkipCheck extends Error {}

/**
 * Run a check body, guaranteeing the promise never rejects: failures become
 * status 'error' results so one bad check can't take down a scan.
 */
export async function runSafely<Raw>(
  type: CheckType,
  body: () => Promise<Raw>,
): Promise<CheckResult<Raw>> {
  const ranAt = new Date().toISOString();
  const started = Date.now();
  try {
    const raw = await body();
    return { type, status: 'ok', ranAt, durationMs: Date.now() - started, raw };
  } catch (err) {
    return {
      type,
      status: err instanceof SkipCheck ? 'skipped' : 'error',
      ranAt,
      durationMs: Date.now() - started,
      raw: null,
      error: errorMessage(err),
    };
  }
}
