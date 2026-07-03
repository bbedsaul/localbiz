import type { LetterGrade } from 'sitevitals-engine';
import { GRADE_HEX } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * The hanging-sign board itself (no bracket) — the shared brand object.
 * Default shows the "LM" monogram. When `grade` is set, the inner panel repaints
 * to the grade color with the letter in cream — the hero's signature moment.
 * Rendered inline so the loaded display font (Zilla Slab) draws the letters crisply.
 */
export function BoardMark({
  size = 48,
  grade,
  className,
  title = 'LocalMarket',
}: {
  size?: number;
  grade?: LetterGrade;
  className?: string;
  title?: string;
}) {
  const height = Math.round(size * (96 / 124));
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 124 96"
      role="img"
      aria-label={title}
      className={cn('font-display', className)}
    >
      {/* board */}
      <rect width="124" height="96" rx="9" fill="rgb(var(--green-900))" />
      {/* inner panel — repaints to the grade color when grading */}
      <rect
        x="8"
        y="8"
        width="108"
        height="80"
        rx="5"
        fill={grade ? GRADE_HEX[grade] : 'none'}
        stroke="rgb(var(--paper-50))"
        strokeWidth="2.5"
        style={{ transition: 'fill 600ms ease' }}
      />
      {grade ? (
        <text
          x="62"
          y="70"
          textAnchor="middle"
          fontSize="60"
          fontWeight={700}
          fill="rgb(var(--paper-50))"
        >
          {grade}
        </text>
      ) : (
        <>
          <text x="62" y="66" textAnchor="middle" fontSize="46" fontWeight={700} fill="rgb(var(--paper-50))">
            L
            <tspan fill="rgb(var(--peach-300))" dx="2">
              M
            </tspan>
          </text>
          <line
            x1="34"
            y1="76"
            x2="90"
            y2="76"
            stroke="rgb(var(--brick-600))"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
