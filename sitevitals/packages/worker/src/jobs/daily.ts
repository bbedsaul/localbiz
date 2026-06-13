import { domainCheck, safebrowsingCheck, sslCheck } from '@sitevitals/engine';
import { evaluateBlacklisted, evaluateDomainExpiring, evaluateSslExpiring } from '../alerts/rules.js';
import type { JobDeps } from './uptime.js';

/** Daily: SSL/domain expiry + Safe Browsing, with alert evaluation. */
export async function runDailyJob(businessId: string, deps: JobDeps): Promise<void> {
  const { repo, alerts, log } = deps;
  const business = await repo.getBusiness(businessId);
  if (!business?.active) return;

  const target = { url: business.url };
  const [ssl, domain, safebrowsing] = await Promise.all([
    sslCheck.run(target),
    domainCheck.run(target),
    safebrowsingCheck.run(target),
  ]);

  await repo.insertCheckResult(business.id, 'ssl', '1d', ssl, ssl.raw?.valid ? 100 : 0);
  await repo.insertCheckResult(business.id, 'domain', '1d', domain, null);
  await repo.insertCheckResult(
    business.id,
    'safebrowsing',
    '1d',
    safebrowsing,
    safebrowsing.status === 'ok' ? (safebrowsing.raw?.flagged ? 0 : 100) : null,
  );

  for (const evaluation of [
    evaluateSslExpiring(business.url, ssl),
    evaluateDomainExpiring(business.url, domain),
    evaluateBlacklisted(business.url, safebrowsing),
  ]) {
    const outcome = await alerts.process(business, evaluation);
    if (outcome !== 'unchanged') {
      log.info({ businessId, type: evaluation.type, outcome }, 'alert state changed');
    }
  }
}
