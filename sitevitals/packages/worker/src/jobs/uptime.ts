import { sslCheck, uptimeCheck } from '@sitevitals/engine';
import type { AlertEngine } from '../alerts/engine.js';
import { evaluateSiteDown } from '../alerts/rules.js';
import type { Repo } from '../db/repo.js';
import type { Logger } from '../logger.js';

export interface JobDeps {
  repo: Repo;
  alerts: AlertEngine;
  log: Logger;
}

/** Lightweight 5-minute check: HTTP + TLS only. */
export async function runUptimeJob(businessId: string, deps: JobDeps): Promise<void> {
  const { repo, alerts, log } = deps;
  const business = await repo.getBusiness(businessId);
  if (!business?.active) return;

  const target = { url: business.url };
  const [uptime, ssl] = await Promise.all([uptimeCheck.run(target), sslCheck.run(target)]);

  // Previous result must be read BEFORE persisting the current one — the
  // site_down rule needs two consecutive failures.
  const previous = await repo.latestCheckResult(business.id, 'uptime');

  await repo.insertCheckResult(business.id, 'uptime', '5m', uptime, uptime.raw?.up ? 100 : 0);
  await repo.insertCheckResult(business.id, 'ssl', '5m', ssl, ssl.raw?.valid ? 100 : 0);

  const outcome = await alerts.process(business, evaluateSiteDown(business.url, uptime, previous));
  if (outcome !== 'unchanged') {
    log.info({ businessId, outcome, up: uptime.raw?.up ?? false }, 'site_down alert state changed');
  }
}
