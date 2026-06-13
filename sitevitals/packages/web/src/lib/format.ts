import type { LetterGrade } from '@sitevitals/engine';

export const GRADE_HEX: Record<LetterGrade, string> = {
  A: '#2E7D32',
  B: '#558B2F',
  C: '#F9A825',
  D: '#EF6C00',
  F: '#C62828',
};

export const GRADE_TAILWIND: Record<LetterGrade, string> = {
  A: 'bg-grade-a',
  B: 'bg-grade-b',
  C: 'bg-grade-c',
  D: 'bg-grade-d',
  F: 'bg-grade-f',
};

export function gradeWord(grade: LetterGrade): string {
  return {
    A: 'Excellent',
    B: 'Good',
    C: 'Needs attention',
    D: 'At risk',
    F: 'Urgent',
  }[grade];
}

/** Normalize a user-typed URL to an absolute https URL. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function prettyHost(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function periodLabel(period: string): string {
  const d = new Date(`${period}-15T00:00:00Z`);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
