import type { CheckResult, CheckType } from '@sitevitals/engine';
import { describe, expect, it } from 'vitest';
import {
  evaluateBlacklisted,
  evaluateDomainExpiring,
  evaluateSiteDown,
  evaluateSslExpiring,
} from '../src/alerts/rules.js';

function ok<Raw>(type: CheckType, raw: Raw): CheckResult<Raw> {
  return { type, status: 'ok', ranAt: new Date().toISOString(), durationMs: 10, raw };
}

function errored(type: CheckType): CheckResult<never> {
  return {
    type,
    status: 'error',
    ranAt: new Date().toISOString(),
    durationMs: 10,
    raw: null,
    error: 'ECONNREFUSED',
  };
}

const URL = 'https://joes-hvac.com';

const upRaw = { finalUrl: URL, statusCode: 200, responseTimeMs: 300, redirects: [], up: true };
const downRaw = { ...upRaw, statusCode: 503, up: false };

describe('evaluateSiteDown — two consecutive failures', () => {
  it('does not trigger on a single failure (blip)', () => {
    expect(evaluateSiteDown(URL, ok('uptime', downRaw), { status: 'ok', raw: upRaw }).triggered).toBe(false);
    expect(evaluateSiteDown(URL, errored('uptime'), null).triggered).toBe(false);
  });

  it('triggers when current and previous both failed', () => {
    const result = evaluateSiteDown(URL, ok('uptime', downRaw), { status: 'ok', raw: downRaw });
    expect(result.triggered).toBe(true);
    expect(result.message).toContain('over 10 minutes');
    expect(result.message).toContain('HTTP 503');
  });

  it('treats errored checks as failures too', () => {
    expect(
      evaluateSiteDown(URL, errored('uptime'), { status: 'error', raw: null }).triggered,
    ).toBe(true);
  });

  it('does not trigger when the site recovered', () => {
    expect(
      evaluateSiteDown(URL, ok('uptime', upRaw), { status: 'ok', raw: downRaw }).triggered,
    ).toBe(false);
  });
});

describe('evaluateSslExpiring', () => {
  const ssl = (daysRemaining: number, valid = true) =>
    ok('ssl', { valid, issuer: 'CA', subject: 'x', validFrom: '', validTo: '', daysRemaining });

  it('triggers under 7 days, not at 7+', () => {
    expect(evaluateSslExpiring(URL, ssl(6)).triggered).toBe(true);
    expect(evaluateSslExpiring(URL, ssl(6)).message).toContain('6 day');
    expect(evaluateSslExpiring(URL, ssl(7)).triggered).toBe(false);
    expect(evaluateSslExpiring(URL, ssl(60)).triggered).toBe(false);
  });

  it('triggers on an invalid certificate regardless of expiry', () => {
    expect(evaluateSslExpiring(URL, ssl(90, false)).triggered).toBe(true);
  });

  it('does not trigger when the check errored (unreachable ≠ expiring)', () => {
    expect(evaluateSslExpiring(URL, errored('ssl')).triggered).toBe(false);
  });
});

describe('evaluateDomainExpiring', () => {
  const domain = (daysRemaining: number | null, supported = true) =>
    ok('domain', {
      supported,
      domain: 'joes-hvac.com',
      registrar: 'NameCheap',
      expiresAt: null,
      daysRemaining,
    });

  it('triggers under 14 days, not at 14+', () => {
    expect(evaluateDomainExpiring(URL, domain(13)).triggered).toBe(true);
    expect(evaluateDomainExpiring(URL, domain(13)).message).toContain('13 day');
    expect(evaluateDomainExpiring(URL, domain(14)).triggered).toBe(false);
  });

  it('stays quiet for unsupported RDAP or unknown expiry', () => {
    expect(evaluateDomainExpiring(URL, domain(null)).triggered).toBe(false);
    expect(evaluateDomainExpiring(URL, domain(5, false)).triggered).toBe(false);
  });
});

describe('evaluateBlacklisted', () => {
  it('triggers on a Safe Browsing flag with the threat list', () => {
    const result = evaluateBlacklisted(URL, ok('safebrowsing', { flagged: true, threats: ['MALWARE'] }));
    expect(result.triggered).toBe(true);
    expect(result.message).toContain('MALWARE');
  });

  it('stays quiet when clean or skipped', () => {
    expect(
      evaluateBlacklisted(URL, ok('safebrowsing', { flagged: false, threats: [] })).triggered,
    ).toBe(false);
    expect(evaluateBlacklisted(URL, errored('safebrowsing')).triggered).toBe(false);
  });
});
