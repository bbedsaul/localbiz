import type { LetterGrade, ScanResult } from '../types.js';

export interface Trend {
  previousGrade: LetterGrade;
  previousComposite: number;
  currentComposite: number;
  /** currentComposite - previousComposite, rounded to 1 decimal. */
  delta: number;
  direction: 'up' | 'down' | 'flat';
  arrow: '↑' | '↓' | '→';
}

/** Movement under 1 point is noise, not a trend. */
export function computeTrend(current: ScanResult, previous: ScanResult): Trend {
  const delta =
    Math.round((current.scores.composite - previous.scores.composite) * 10) / 10;
  const direction = delta >= 1 ? 'up' : delta <= -1 ? 'down' : 'flat';
  return {
    previousGrade: previous.scores.grade,
    previousComposite: previous.scores.composite,
    currentComposite: current.scores.composite,
    delta,
    direction,
    arrow: direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→',
  };
}
