import { describe, it, expect, jest } from '@jest/globals';
import type { Prospect, ProspectScan } from '../src/types.js';

// db.ts constructs the Supabase client at import time; stub it so importing
// the pure rankHotLeads helper doesn't require live env vars.
jest.unstable_mockModule('@platform/core/db', () => ({ supabase: {} }));

const { rankHotLeads } = await import('../src/db.js');

function prospect(name: string, scan: ProspectScan | null): Prospect {
  return {
    place_id: name,
    name,
    score: 50,
    status: 'new',
    city: 'Austin',
    category: 'HVAC',
    scan,
  };
}

const scan = (grade: ProspectScan['grade'], composite: number): ProspectScan => ({
  grade,
  composite,
  scanned_at: '2026-06-13T00:00:00.000Z',
});

describe('rankHotLeads', () => {
  it('keeps only D and F grades', () => {
    const prospects = [
      prospect('a', scan('A', 95)),
      prospect('b', scan('C', 72)),
      prospect('d', scan('D', 64)),
      prospect('f', scan('F', 41)),
    ];
    const hot = rankHotLeads(prospects, 20);
    expect(hot.map((p) => p.name)).toEqual(['f', 'd']);
  });

  it('orders worst (lowest composite) first', () => {
    const prospects = [
      prospect('d-high', scan('D', 68)),
      prospect('f-low', scan('F', 22)),
      prospect('f-mid', scan('F', 55)),
    ];
    const hot = rankHotLeads(prospects, 20);
    expect(hot.map((p) => p.name)).toEqual(['f-low', 'f-mid', 'd-high']);
  });

  it('respects the limit', () => {
    const prospects = [
      prospect('f1', scan('F', 10)),
      prospect('f2', scan('F', 20)),
      prospect('f3', scan('F', 30)),
    ];
    expect(rankHotLeads(prospects, 2).map((p) => p.name)).toEqual(['f1', 'f2']);
  });

  it('ignores prospects with no scan', () => {
    const prospects = [prospect('unscored', null), prospect('f', scan('F', 30))];
    expect(rankHotLeads(prospects, 20).map((p) => p.name)).toEqual(['f']);
  });
});
