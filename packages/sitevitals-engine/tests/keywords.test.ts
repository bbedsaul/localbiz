import { describe, expect, it } from 'vitest';
import { suggestKeywords } from '../src/keywords.js';

describe('suggestKeywords', () => {
  it('uses the curated service list for known categories', () => {
    expect(suggestKeywords('HVAC', 'Austin')).toEqual([
      'hvac repair austin',
      'ac repair austin',
      'ac installation austin',
      'furnace repair austin',
      'hvac company austin',
    ]);
  });

  it('matches categories loosely ("HVAC contractor", "Dental clinic")', () => {
    expect(suggestKeywords('HVAC contractor', 'Boise')[0]).toBe('hvac repair boise');
    expect(suggestKeywords('Dental clinic', 'Boise')[0]).toBe('dentist boise');
  });

  it('strips state suffixes from the city', () => {
    expect(suggestKeywords('plumbing', 'Austin, TX')[0]).toBe('plumber austin');
  });

  it('falls back to generic patterns for unknown categories', () => {
    const keywords = suggestKeywords('axe throwing', 'Denver');
    expect(keywords).toHaveLength(5);
    expect(keywords).toContain('axe throwing denver');
    expect(keywords).toContain('best axe throwing denver');
    // "near me" phrases must not get the city appended.
    expect(keywords).toContain('axe throwing near me');
  });

  it('respects the count limit', () => {
    expect(suggestKeywords('hvac', 'Austin', 3)).toHaveLength(3);
  });
});
