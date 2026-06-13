import tls from 'node:tls';
import type { Check, SslRaw } from '../types.js';
import { DEFAULT_TIMEOUT_MS, normalizeUrl } from '../util/http.js';
import { assertPublicHost } from '../util/ssrf.js';
import { runSafely } from '../util/run-safely.js';

const MS_PER_DAY = 86_400_000;

function formatDn(dn: Record<string, unknown> | undefined): string | null {
  if (!dn) return null;
  const parts = ['O', 'CN'].map((k) => dn[k]).filter((v): v is string => typeof v === 'string');
  return parts.length > 0 ? parts.join(' / ') : null;
}

function handshake(host: string, port: number): Promise<SslRaw> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      // We want details of bad certs too, not just a connection error.
      rejectUnauthorized: false,
      timeout: DEFAULT_TIMEOUT_MS,
    });
    socket.on('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      socket.end();
      if (!cert || Object.keys(cert).length === 0) {
        reject(new Error(`No peer certificate presented by ${host}`));
        return;
      }
      const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
      const daysRemaining = validTo
        ? Math.floor((validTo.getTime() - Date.now()) / MS_PER_DAY)
        : null;
      resolve({
        valid: authorized && (daysRemaining === null || daysRemaining >= 0),
        issuer: formatDn(cert.issuer as unknown as Record<string, unknown>),
        subject: formatDn(cert.subject as unknown as Record<string, unknown>),
        validFrom: cert.valid_from ? new Date(cert.valid_from).toISOString() : null,
        validTo: validTo ? validTo.toISOString() : null,
        daysRemaining,
      });
    });
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`TLS handshake with ${host}:${port} timed out`));
    });
    socket.on('error', reject);
  });
}

export const sslCheck: Check<SslRaw> = {
  type: 'ssl',
  run: (target) =>
    runSafely('ssl', async () => {
      const { hostname, port } = new URL(normalizeUrl(target.url));
      await assertPublicHost(hostname); // SSRF guard before the TLS handshake
      return handshake(hostname, port ? Number(port) : 443);
    }),
};
