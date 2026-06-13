import { lookup } from 'node:dns/promises';

/**
 * SSRF protection. The engine fetches arbitrary user-supplied URLs (the scanned
 * site, its redirects, its internal links) and will eventually power a public
 * free-scan endpoint. Before connecting we resolve the host and refuse private,
 * loopback, link-local, and cloud-metadata addresses — blocking attempts to
 * reach internal services or `169.254.169.254`.
 */
export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

/** Fixed third-party API hosts the engine calls (not user-controlled) — skip the guard. */
const TRUSTED_HOSTS = new Set([
  'rdap.org',
  'www.googleapis.com',
  'safebrowsing.googleapis.com',
  'places.googleapis.com',
  'api.dataforseo.com',
  'serpapi.com',
  'api.yelp.com',
  'graph.facebook.com',
]);

function ipv4Blocked(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 10) return true; // private 10/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16/12
  if (a === 192 && b === 168) return true; // private 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10 (Alibaba metadata)
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark 198.18/15
  if (a >= 224) return true; // multicast/reserved 224+
  return false;
}

function ipv6Blocked(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === '::1' || s === '::') return true; // loopback / unspecified
  if (s.startsWith('fc') || s.startsWith('fd')) return true; // unique-local fc00::/7
  if (/^fe[89ab]/.test(s)) return true; // link-local fe80::/10
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Blocked(mapped[1]!);
  return false;
}

export function isBlockedIp(ip: string): boolean {
  return ip.includes(':') ? ipv6Blocked(ip) : ipv4Blocked(ip);
}

/** Resolve a hostname (or IP literal) and throw if any resolved address is private/reserved. */
export async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, ''); // strip ipv6 brackets
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    // DNS failure: let the real fetch surface the network error (ENOTFOUND etc.).
    return;
  }
  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new SsrfBlockedError(
        `Refusing to connect to ${hostname} → ${address} (private/reserved address)`,
      );
    }
  }
}

/** Validate scheme + resolve host. Trusted API hosts bypass the resolution. */
export async function assertPublicUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SsrfBlockedError(`Invalid URL: ${url}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError(`Refusing non-http(s) scheme: ${parsed.protocol}`);
  }
  if (TRUSTED_HOSTS.has(parsed.hostname)) return;
  await assertPublicHost(parsed.hostname);
}
