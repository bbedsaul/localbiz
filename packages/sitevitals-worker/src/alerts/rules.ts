import type {
  CheckResult,
  DomainRaw,
  SafeBrowsingRaw,
  SslRaw,
  UptimeRaw,
} from 'sitevitals-engine';
import type { AlertType, CheckResultRow } from '../db/types.js';

export interface AlertEvaluation {
  type: AlertType;
  triggered: boolean;
  message: string;
}

export const SSL_ALERT_DAYS = 7;
export const DOMAIN_ALERT_DAYS = 14;

function uptimeFailed(status: 'ok' | 'error' | 'skipped', raw: unknown): boolean {
  if (status === 'error') return true;
  if (status !== 'ok') return false;
  return (raw as UptimeRaw | null)?.up === false;
}

/**
 * "Down >10 minutes" at a 5-minute cadence = the current check failed AND the
 * previous persisted check also failed. A single blip never alerts.
 */
export function evaluateSiteDown(
  url: string,
  current: CheckResult<UptimeRaw>,
  previous: Pick<CheckResultRow, 'status' | 'raw'> | null,
): AlertEvaluation {
  const currentFailed = uptimeFailed(current.status, current.raw);
  const previousFailed = previous !== null && uptimeFailed(previous.status, previous.raw);
  const detail =
    current.status === 'ok' && current.raw
      ? `answering with HTTP ${current.raw.statusCode}`
      : `not responding (${current.error ?? 'no response'})`;
  return {
    type: 'site_down',
    triggered: currentFailed && previousFailed,
    message: `${url} has been down for over 10 minutes — ${detail}.`,
  };
}

export function evaluateSslExpiring(url: string, ssl: CheckResult<SslRaw>): AlertEvaluation {
  if (ssl.status !== 'ok' || !ssl.raw) {
    // Can't reach the cert ≠ expiring; site_down covers unreachable hosts.
    return { type: 'ssl_expiring', triggered: false, message: '' };
  }
  const { valid, daysRemaining } = ssl.raw;
  const expiring = !valid || (daysRemaining !== null && daysRemaining < SSL_ALERT_DAYS);
  return {
    type: 'ssl_expiring',
    triggered: expiring,
    message: !valid
      ? `The security certificate for ${url} is invalid — browsers are showing visitors a warning.`
      : `The security certificate for ${url} expires in ${daysRemaining} day(s). Renew it before visitors see browser warnings.`,
  };
}

export function evaluateDomainExpiring(
  url: string,
  domain: CheckResult<DomainRaw>,
): AlertEvaluation {
  const raw = domain.status === 'ok' ? domain.raw : null;
  const triggered =
    raw !== null &&
    raw.supported &&
    raw.daysRemaining !== null &&
    raw.daysRemaining < DOMAIN_ALERT_DAYS;
  return {
    type: 'domain_expiring',
    triggered,
    message: triggered
      ? `The domain ${raw.domain} expires in ${raw.daysRemaining} day(s)${raw.registrar ? ` (registrar: ${raw.registrar})` : ''}. If it lapses, the website and email stop working.`
      : '',
  };
}

export function evaluateBlacklisted(
  url: string,
  safebrowsing: CheckResult<SafeBrowsingRaw>,
): AlertEvaluation {
  const raw = safebrowsing.status === 'ok' ? safebrowsing.raw : null;
  const triggered = raw?.flagged === true;
  return {
    type: 'blacklisted',
    triggered,
    message: triggered
      ? `Google Safe Browsing has flagged ${url} (${raw.threats.join(', ')}). Browsers may be warning visitors away right now.`
      : '',
  };
}
