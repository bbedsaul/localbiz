import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { DataForSeoProvider } from '../src/providers/dataforseo.js';
import { createSerpProvider } from '../src/providers/serp.js';
import { SerpApiProvider } from '../src/providers/serpapi.js';

const FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'dataforseo-response.json',
);

async function fixtureFetch(): Promise<typeof fetch> {
  const body = await readFile(FIXTURE, 'utf8');
  return vi.fn(async () => new Response(body, { status: 200 })) as unknown as typeof fetch;
}

describe('DataForSeoProvider', () => {
  it('parses position, map pack, and competitors from a recorded response', async () => {
    const provider = new DataForSeoProvider('login', 'password', await fixtureFetch());
    const rank = await provider.rank('hvac repair austin', 'joes-hvac.com', 'United States');

    expect(rank.position).toBe(4);
    expect(rank.mapPack).toBe(true);
    // First three organic domains that are not ours, www stripped, deduped.
    expect(rank.topCompetitors).toEqual(['yelp.com', 'coolbreezehvac.com', 'austinairpros.com']);
  });

  it('returns null position for a domain not in the results', async () => {
    const provider = new DataForSeoProvider('login', 'password', await fixtureFetch());
    const rank = await provider.rank('hvac repair austin', 'unranked.example', 'United States');
    expect(rank.position).toBeNull();
    expect(rank.mapPack).toBe(false);
  });

  it('accumulates vendor-reported cost across queries', async () => {
    const provider = new DataForSeoProvider('login', 'password', await fixtureFetch());
    await provider.rank('a', 'joes-hvac.com', 'United States');
    await provider.rank('b', 'joes-hvac.com', 'United States');
    expect(provider.costUsd()).toBeCloseTo(0.004, 6);
  });

  it('retries country-wide when a non-canonical location is rejected', async () => {
    const good = await readFile(FIXTURE, 'utf8');
    const bad = JSON.stringify({
      status_code: 20000,
      tasks: [{ status_code: 40501, status_message: 'Invalid Field: location_name.', cost: 0 }],
    });
    let calls = 0;
    const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) => {
      calls += 1;
      const payload = JSON.parse(String(init?.body)) as { location_name: string }[];
      return new Response(payload[0]?.location_name === 'United States' ? good : bad, {
        status: 200,
      });
    }) as unknown as typeof fetch;

    const provider = new DataForSeoProvider('login', 'password', fetchFn);
    const rank = await provider.rank('hvac repair austin', 'joes-hvac.com', 'Austin');
    expect(calls).toBe(2);
    expect(rank.position).toBe(4);
  });
});

describe('SerpApiProvider stub', () => {
  it('exposes the interface but rejects until implemented', async () => {
    const provider = new SerpApiProvider('key');
    expect(provider.name).toBe('serpapi');
    expect(provider.costUsd()).toBeNull();
    await expect(provider.rank('k', 'd.com', 'loc')).rejects.toThrow(/not implemented/);
  });
});

describe('createSerpProvider', () => {
  it('defaults to DataForSEO when credentials exist', () => {
    const provider = createSerpProvider({ DATAFORSEO_LOGIN: 'l', DATAFORSEO_PASSWORD: 'p' });
    expect(provider?.name).toBe('dataforseo');
  });

  it('selects SerpApi via SERP_PROVIDER', () => {
    const provider = createSerpProvider({ SERP_PROVIDER: 'serpapi', SERPAPI_KEY: 'k' });
    expect(provider?.name).toBe('serpapi');
  });

  it('returns null when the chosen provider has no credentials', () => {
    expect(createSerpProvider({})).toBeNull();
    expect(createSerpProvider({ SERP_PROVIDER: 'serpapi' })).toBeNull();
  });

  it('rejects unknown providers loudly', () => {
    expect(() => createSerpProvider({ SERP_PROVIDER: 'bing' })).toThrow(/Unknown SERP_PROVIDER/);
  });
});
