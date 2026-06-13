import type { RedirectHop } from '../types.js';
import { assertPublicUrl } from './ssrf.js';

export const DEFAULT_TIMEOUT_MS = 10_000;
export const USER_AGENT = 'SiteVitalsBot/0.1 (+https://sitevitals.app)';

/** Pass `{ allowPrivate: true }` only in tests that target a local server. */
export interface FetchOpts {
  allowPrivate?: boolean;
}

/** Prepend https:// when the user typed a bare domain. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  opts: FetchOpts = {},
): Promise<Response> {
  // SSRF guard: refuse private/reserved targets before connecting. Covers
  // redirect hops too, since followRedirects re-enters this function per hop.
  if (!opts.allowPrivate) {
    await assertPublicUrl(url);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: 'follow',
      ...init,
      headers: { 'user-agent': USER_AGENT, ...(init.headers ?? {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export interface RedirectTrace {
  hops: RedirectHop[];
  finalUrl: string;
  status: number;
  response: Response;
}

/**
 * Follow redirects manually so we can record the chain. Response bodies of
 * intermediate hops are discarded; the final response body is left unread for
 * the caller.
 */
export async function followRedirects(
  url: string,
  maxHops = 10,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  opts: FetchOpts = {},
): Promise<RedirectTrace> {
  const hops: RedirectHop[] = [];
  let current = url;

  for (let i = 0; i <= maxHops; i++) {
    const response = await fetchWithTimeout(current, { redirect: 'manual' }, timeoutMs, opts);
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      hops.push({ url: current, status: response.status });
      await response.body?.cancel();
      current = new URL(location, current).toString();
      continue;
    }
    return { hops, finalUrl: current, status: response.status, response };
  }
  throw new Error(`Too many redirects (>${maxHops}) starting from ${url}`);
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    // Undici wraps the interesting part (ECONNREFUSED, ENOTFOUND…) in `cause`.
    const cause = err.cause instanceof Error ? ` (${err.cause.message})` : '';
    return `${err.message}${cause}`;
  }
  return String(err);
}
