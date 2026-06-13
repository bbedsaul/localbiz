import { describe, expect, it } from 'vitest';
import type { Listing } from '../src/types.js';
import {
  compareListings,
  nameFromDomain,
  namesMatch,
  normalizeAddress,
  normalizePhone,
} from '../src/util/nap.js';
import { diceSimilarity } from '../src/util/similarity.js';

function listing(overrides: Partial<Listing> & { source: Listing['source'] }): Listing {
  return {
    found: true,
    name: "Joe's HVAC",
    address: '123 Main Street, Austin, TX 78701',
    phone: '(512) 555-1234',
    hours: null,
    rating: 4.8,
    reviewCount: 120,
    url: 'https://joes-hvac.com',
    ...overrides,
  };
}

describe('normalizePhone', () => {
  it('converts US formats to E.164', () => {
    expect(normalizePhone('(512) 555-1234')).toBe('+15125551234');
    expect(normalizePhone('512-555-1234')).toBe('+15125551234');
    expect(normalizePhone('1 512 555 1234')).toBe('+15125551234');
    expect(normalizePhone('+1 512-555-1234')).toBe('+15125551234');
  });

  it('passes through international numbers', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('returns null for garbage', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('call us!')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
  });
});

describe('normalizeAddress', () => {
  it('canonicalizes abbreviations and punctuation', () => {
    expect(normalizeAddress('123 Main Street, Austin, TX 78701')).toBe(
      normalizeAddress('123 Main St Austin TX 78701'),
    );
    expect(normalizeAddress('500 N. Lamar Boulevard, Suite 200')).toBe(
      normalizeAddress('500 North Lamar Blvd Ste 200'),
    );
  });
});

describe('name fuzzy matching', () => {
  it('treats minor variants as the same business', () => {
    expect(namesMatch("Joe's HVAC", 'Joes HVAC')).toBe(true);
    expect(namesMatch("Joe's HVAC", 'JOES HVAC LLC')).toBe(true);
  });

  it('rejects different businesses', () => {
    expect(namesMatch("Joe's HVAC", 'Cool Breeze Air Conditioning')).toBe(false);
  });

  it('diceSimilarity is symmetric and bounded', () => {
    const a = diceSimilarity('Joes HVAC', 'Cool Breeze');
    const b = diceSimilarity('Cool Breeze', 'Joes HVAC');
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
    expect(diceSimilarity('same', 'same')).toBe(1);
  });
});

describe('compareListings', () => {
  it('reports no mismatches for consistent listings', () => {
    const result = compareListings([
      listing({ source: 'google' }),
      listing({ source: 'yelp', phone: '+1 512 555 1234', name: 'Joes HVAC' }),
    ]);
    expect(result.comparedFields).toEqual(['phone', 'address', 'name']);
    expect(result.mismatches).toEqual([]);
  });

  it('flags phone mismatches with a plain-English message', () => {
    const result = compareListings([
      listing({ source: 'google' }),
      listing({ source: 'yelp', phone: '(512) 555-9999' }),
    ]);
    const phone = result.mismatches.find((m) => m.field === 'phone');
    expect(phone).toBeDefined();
    expect(phone?.sources).toEqual(['google', 'yelp']);
    expect(phone?.message).toContain("phone number doesn't match");
    expect(phone?.message).toContain('Google');
    expect(phone?.message).toContain('Yelp');
  });

  it('flags name mismatches only below the similarity threshold', () => {
    const ok = compareListings([
      listing({ source: 'google' }),
      listing({ source: 'facebook', name: 'Joes HVAC LLC' }),
    ]);
    expect(ok.mismatches.find((m) => m.field === 'name')).toBeUndefined();

    const bad = compareListings([
      listing({ source: 'google' }),
      listing({ source: 'facebook', name: 'Cool Breeze AC' }),
    ]);
    expect(bad.mismatches.find((m) => m.field === 'name')).toBeDefined();
  });

  it('skips fields present on fewer than two listings', () => {
    const result = compareListings([
      listing({ source: 'google', hours: ['Monday: 8 AM – 5 PM'] }),
      listing({ source: 'yelp', hours: null }),
    ]);
    expect(result.comparedFields).not.toContain('hours');
  });

  it('ignores not-found listings entirely', () => {
    const result = compareListings([
      listing({ source: 'google' }),
      listing({ source: 'yelp', found: false, name: null, phone: null, address: null }),
    ]);
    expect(result.comparedFields).toEqual([]);
    expect(result.mismatches).toEqual([]);
  });
});

describe('nameFromDomain', () => {
  it('derives a searchable name', () => {
    expect(nameFromDomain('www.joes-hvac.com')).toBe('joes hvac');
    expect(nameFromDomain('coolbreeze.co.uk')).toBe('coolbreeze co');
  });

  it('returns null for IPs and localhost', () => {
    expect(nameFromDomain('127.0.0.1')).toBeNull();
    expect(nameFromDomain('localhost')).toBeNull();
  });
});
