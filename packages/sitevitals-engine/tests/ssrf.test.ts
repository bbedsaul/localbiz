import { afterEach, describe, expect, it, vi } from 'vitest';

// Hermetic: resolve hostnames from a fixed map (IP literals resolve to themselves).
vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async (host: string) => {
    const map: Record<string, string> = {
      localhost: '127.0.0.1',
      'internal.corp': '10.0.0.5',
      'rebind.evil': '169.254.169.254', // open-redirect / DNS-rebind to cloud metadata
      'example.com': '93.184.216.34',
      'public.test': '8.8.8.8',
    };
    const ip = map[host] ?? host;
    return [{ address: ip, family: ip.includes(':') ? 6 : 4 }];
  }),
}));

const { assertPublicUrl, isBlockedIp, SsrfBlockedError } = await import('../src/util/ssrf.js');
const { fetchWithTimeout, followRedirects } = await import('../src/util/http.js');

afterEach(() => vi.unstubAllGlobals());

describe('isBlockedIp', () => {
  it('blocks loopback, private, link-local, metadata, and reserved', () => {
    for (const ip of [
      '127.0.0.1',
      '10.0.0.1',
      '172.16.5.4',
      '192.168.1.1',
      '169.254.169.254', // cloud metadata
      '100.100.100.200', // CGNAT / Alibaba metadata
      '0.0.0.0',
      '::1',
      'fc00::1',
      'fe80::1',
      '::ffff:127.0.0.1', // IPv4-mapped loopback
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it('allows ordinary public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111']) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });
});

describe('assertPublicUrl', () => {
  it('rejects non-http(s) schemes', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicUrl('ftp://example.com')).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('blocks loopback / metadata / private targets (literal and via DNS)', async () => {
    await expect(assertPublicUrl('http://127.0.0.1/')).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicUrl('http://localhost/admin')).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(
      assertPublicUrl('http://169.254.169.254/latest/meta-data/'),
    ).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicUrl('http://internal.corp/')).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('allows public hosts and trusted API hosts', async () => {
    await expect(assertPublicUrl('https://example.com/')).resolves.toBeUndefined();
    await expect(assertPublicUrl('https://www.googleapis.com/x')).resolves.toBeUndefined();
  });
});

describe('fetchWithTimeout SSRF guard', () => {
  it('refuses a private target before connecting', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    await expect(fetchWithTimeout('http://10.0.0.5/')).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(spy).not.toHaveBeenCalled(); // blocked before any network call
  });

  it('honors allowPrivate (for tests targeting a local server)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok')));
    await expect(
      fetchWithTimeout('http://127.0.0.1:8080/', {}, 5000, { allowPrivate: true }),
    ).resolves.toBeInstanceOf(Response);
  });
});

describe('followRedirects per-hop guard', () => {
  it('blocks a redirect hop that points at cloud metadata', async () => {
    // public.test (8.8.8.8) → 302 → rebind.evil (169.254.169.254): blocked on the hop.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://rebind.evil/' } })),
    );
    await expect(followRedirects('http://public.test/')).rejects.toBeInstanceOf(SsrfBlockedError);
  });
});
