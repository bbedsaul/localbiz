import type { Check, DomainRaw } from '../types.js';
import { fetchWithTimeout, normalizeUrl } from '../util/http.js';
import { runSafely } from '../util/run-safely.js';

const MS_PER_DAY = 86_400_000;

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: [string, [string, unknown, string, unknown][]];
}

interface RdapResponse {
  events?: RdapEvent[];
  entities?: RdapEntity[];
}

function registrarName(entities: RdapEntity[] | undefined): string | null {
  const registrar = entities?.find((e) => e.roles?.includes('registrar'));
  const fn = registrar?.vcardArray?.[1]?.find((field) => field[0] === 'fn');
  return typeof fn?.[3] === 'string' ? fn[3] : null;
}

async function rdapLookup(domain: string): Promise<RdapResponse | null> {
  // rdap.org redirects to the authoritative RDAP server for the TLD.
  const response = await fetchWithTimeout(`https://rdap.org/domain/${domain}`, {
    headers: { accept: 'application/rdap+json' },
  });
  if (!response.ok) {
    await response.body?.cancel();
    return null;
  }
  return (await response.json()) as RdapResponse;
}

export const domainCheck: Check<DomainRaw> = {
  type: 'domain',
  run: (target) =>
    runSafely('domain', async () => {
      const hostname = new URL(normalizeUrl(target.url)).hostname.replace(/^www\./i, '');
      // Try the full hostname first, then the apex (last two labels) for
      // subdomains. Naive for multi-part TLDs like .co.uk, where the first
      // candidate covers the common case anyway.
      const labels = hostname.split('.');
      const candidates = [hostname];
      if (labels.length > 2) candidates.push(labels.slice(-2).join('.'));

      for (const candidate of candidates) {
        let data: RdapResponse | null = null;
        try {
          data = await rdapLookup(candidate);
        } catch {
          continue; // network/timeout on this candidate — try the next
        }
        if (!data) continue;
        const expiry = data.events?.find((e) => e.eventAction === 'expiration')?.eventDate;
        const expiresAt = expiry ? new Date(expiry).toISOString() : null;
        return {
          supported: true,
          domain: candidate,
          registrar: registrarName(data.entities),
          expiresAt,
          daysRemaining: expiresAt
            ? Math.floor((new Date(expiresAt).getTime() - Date.now()) / MS_PER_DAY)
            : null,
        };
      }

      // Registrar/TLD without RDAP support — report gracefully, not as an error.
      return {
        supported: false,
        domain: hostname,
        registrar: null,
        expiresAt: null,
        daysRemaining: null,
      };
    }),
};
