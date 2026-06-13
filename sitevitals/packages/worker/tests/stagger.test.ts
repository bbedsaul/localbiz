import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  dailyJitterMs,
  hashId,
  monthlyJitterMs,
  uptimeJitterMs,
  weeklyScanDay,
} from '../src/queues/stagger.js';

describe('stagger', () => {
  it('hashId is deterministic and unsigned', () => {
    const id = 'b7a9e2d4-0000-4000-8000-123456789abc';
    expect(hashId(id)).toBe(hashId(id));
    expect(hashId(id)).toBeGreaterThanOrEqual(0);
    expect(hashId('a')).not.toBe(hashId('b'));
  });

  it('jitters stay inside their windows', () => {
    for (let i = 0; i < 200; i++) {
      const id = randomUUID();
      expect(uptimeJitterMs(id)).toBeLessThan(240_000);
      expect(dailyJitterMs(id)).toBeLessThan(3_600_000);
      expect(monthlyJitterMs(id)).toBeLessThan(14_400_000);
      const day = weeklyScanDay(id);
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThan(7);
    }
  });

  it('spreads weekly scans across all 7 days for a realistic population', () => {
    const counts = new Array<number>(7).fill(0);
    for (let i = 0; i < 700; i++) {
      counts[weeklyScanDay(randomUUID())]! += 1;
    }
    // Every weekday gets a meaningful share (PageSpeed quota protection).
    for (const count of counts) {
      expect(count).toBeGreaterThan(40); // ~100 expected per day
    }
  });
});
