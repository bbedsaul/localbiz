import type { Listing, ListingSource, NapField, NapMismatch } from '../types.js';
import { diceSimilarity } from './similarity.js';

export const NAME_SIMILARITY_THRESHOLD = 0.85;

const SOURCE_LABELS: Record<ListingSource, string> = {
  google: 'Google',
  yelp: 'Yelp',
  facebook: 'Facebook',
};

/** Normalize a phone number to E.164, assuming US numbers when no country code. */
export function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  if (digits.startsWith('+')) {
    const rest = digits.slice(1);
    return rest.length >= 8 && rest.length <= 15 ? `+${rest}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

const STREET_ABBREVIATIONS: Record<string, string> = {
  street: 'st',
  avenue: 'ave',
  boulevard: 'blvd',
  drive: 'dr',
  lane: 'ln',
  road: 'rd',
  court: 'ct',
  place: 'pl',
  parkway: 'pkwy',
  highway: 'hwy',
  suite: 'ste',
  north: 'n',
  south: 's',
  east: 'e',
  west: 'w',
};

/** Simplified address form for comparison: lowercase, canonical abbreviations, no punctuation. */
export function normalizeAddress(raw: string | null): string | null {
  if (!raw) return null;
  const words = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => STREET_ABBREVIATIONS[w] ?? w);
  return words.length > 0 ? words.join(' ') : null;
}

const LEGAL_SUFFIXES = new Set(['llc', 'inc', 'co', 'corp', 'corporation', 'ltd', 'llp', 'pllc', 'pc', 'company']);

/** "Joes HVAC LLC" → "joes hvac": legal suffixes don't make it a different business. */
function canonicalName(raw: string): string {
  const tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length > 1 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1] ?? '')) {
    tokens.pop();
  }
  return tokens.join(' ');
}

export function namesMatch(a: string, b: string): boolean {
  return diceSimilarity(canonicalName(a), canonicalName(b)) >= NAME_SIMILARITY_THRESHOLD;
}

function normalizeHours(hours: string[]): string {
  return hours
    .map((h) => h.toLowerCase().replace(/\s+/g, ' ').trim())
    .sort()
    .join(' | ');
}

interface FieldSpec {
  field: NapField;
  weight: number;
  extract: (l: Listing) => string | null;
  /** Whether two normalized values count as consistent. */
  matches: (a: string, b: string) => boolean;
  describe: (mismatch: { sources: ListingSource[]; values: string[] }) => string;
}

function listPairs(sources: ListingSource[], values: string[]): string {
  return sources.map((s, i) => `${SOURCE_LABELS[s]} shows "${values[i]}"`).join(', but ');
}

/** Comparison weights per NAP field; renormalized over the fields actually compared. */
export const NAP_FIELD_WEIGHTS: Record<NapField, number> = {
  phone: 0.3,
  address: 0.3,
  name: 0.25,
  hours: 0.15,
};

const FIELD_SPECS: FieldSpec[] = [
  {
    field: 'phone',
    weight: NAP_FIELD_WEIGHTS.phone,
    extract: (l) => normalizePhone(l.phone),
    matches: (a, b) => a === b,
    describe: ({ sources, values }) =>
      `The phone number doesn't match everywhere: ${listPairs(sources, values)}. Customers calling the wrong number is lost business.`,
  },
  {
    field: 'address',
    weight: NAP_FIELD_WEIGHTS.address,
    extract: (l) => normalizeAddress(l.address),
    matches: (a, b) => a === b || diceSimilarity(a, b) >= NAME_SIMILARITY_THRESHOLD,
    describe: ({ sources, values }) =>
      `The address doesn't match everywhere: ${listPairs(sources, values)}. Inconsistent addresses confuse customers and hurt local search ranking.`,
  },
  {
    field: 'name',
    weight: NAP_FIELD_WEIGHTS.name,
    extract: (l) => l.name?.trim() || null,
    matches: namesMatch,
    describe: ({ sources, values }) =>
      `The business name is listed differently: ${listPairs(sources, values)}. Search engines may treat these as different businesses.`,
  },
  {
    field: 'hours',
    weight: NAP_FIELD_WEIGHTS.hours,
    extract: (l) => (l.hours && l.hours.length > 0 ? normalizeHours(l.hours) : null),
    matches: (a, b) => a === b,
    describe: ({ sources }) =>
      `Opening hours differ between ${sources.map((s) => SOURCE_LABELS[s]).join(' and ')}. Customers showing up to a closed door rarely come back.`,
  },
];

export interface NapComparison {
  comparedFields: NapField[];
  mismatches: NapMismatch[];
}

/**
 * Compare NAP fields across found listings. A field is compared only when 2+
 * listings have a value for it; consistency requires every pair to match.
 */
export function compareListings(listings: Listing[]): NapComparison {
  const found = listings.filter((l) => l.found);
  const comparedFields: NapField[] = [];
  const mismatches: NapMismatch[] = [];

  for (const spec of FIELD_SPECS) {
    const present = found
      .map((l) => ({ source: l.source, normalized: spec.extract(l), original: rawValue(l, spec) }))
      .filter((v): v is typeof v & { normalized: string } => v.normalized !== null);
    if (present.length < 2) continue;
    comparedFields.push(spec.field);

    const consistent = present.every((v, i) =>
      present.slice(i + 1).every((w) => spec.matches(v.normalized, w.normalized)),
    );
    if (!consistent) {
      const sources = present.map((v) => v.source);
      const values = present.map((v) => v.original);
      mismatches.push({
        field: spec.field,
        sources,
        values,
        message: spec.describe({ sources, values }),
      });
    }
  }

  return { comparedFields, mismatches };
}

function rawValue(listing: Listing, spec: FieldSpec): string {
  switch (spec.field) {
    case 'phone':
      return listing.phone ?? '';
    case 'address':
      return listing.address ?? '';
    case 'name':
      return listing.name ?? '';
    case 'hours':
      return listing.hours?.join('; ') ?? '';
  }
}

/**
 * Derive a searchable business name from a domain ("joes-hvac.com" → "joes
 * hvac"). Returns null for IPs/localhost, where a lookup would be nonsense.
 */
export function nameFromDomain(hostname: string): string | null {
  const host = hostname.replace(/^www\./i, '');
  if (host === 'localhost' || /^[\d.:]+$/.test(host)) return null;
  const labels = host.split('.');
  const base = labels.length > 1 ? labels.slice(0, -1).join('.') : host;
  const name = base.replace(/[-_.]+/g, ' ').trim();
  return name.length > 1 ? name : null;
}
