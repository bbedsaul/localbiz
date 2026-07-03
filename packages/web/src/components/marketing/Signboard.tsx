import type { LetterGrade } from 'sitevitals-engine';
import { GRADE_HEX } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * The hero's signature object: a hanging shop sign that settles from a tilt on
 * load (pivoting at the beam), then repaints its panel to the visitor's own scan
 * grade. One orchestrated moment. Motion is pure CSS, so prefers-reduced-motion
 * (handled globally in globals.css) neutralizes it and the board just shows the
 * result statically.
 */
export function Signboard({
  grade = null,
  className,
}: {
  grade?: LetterGrade | null;
  className?: string;
}) {
  const label = grade ? `Your website scored ${grade}` : 'LocalMarket shop sign';
  return (
    <svg
      viewBox="0 0 340 320"
      role="img"
      aria-label={label}
      className={cn('h-auto w-full max-w-[420px] drop-shadow-[0_18px_28px_rgba(23,72,59,0.20)]', className)}
    >
      {/* overhead bracket (static) */}
      <g fill="rgb(var(--charcoal-900))">
        <rect x="60" y="28" width="220" height="11" rx="4" />
        <rect x="61" y="28" width="11" height="34" rx="4" />
        <rect x="268" y="28" width="11" height="34" rx="4" />
      </g>

      {/* swinging group — chains + board pivot at the beam */}
      <g
        className="motion-safe:animate-sign-settle"
        style={{ transformBox: 'view-box', transformOrigin: '170px 34px' }}
      >
        {/* hanging rings + chains */}
        <circle cx="132" cy="41" r="6" fill="none" stroke="rgb(var(--charcoal-900))" strokeWidth="3.5" />
        <circle cx="208" cy="41" r="6" fill="none" stroke="rgb(var(--charcoal-900))" strokeWidth="3.5" />
        <line x1="132" y1="47" x2="132" y2="86" stroke="rgb(var(--charcoal-900))" strokeWidth="4" />
        <line x1="208" y1="47" x2="208" y2="86" stroke="rgb(var(--charcoal-900))" strokeWidth="4" />

        {/* board */}
        <rect x="85" y="84" width="170" height="140" rx="13" fill="rgb(var(--green-900))" />
        {/* inner panel — repaints to the grade color */}
        <rect
          x="95"
          y="94"
          width="150"
          height="120"
          rx="7"
          fill={grade ? GRADE_HEX[grade] : 'none'}
          stroke="rgb(var(--paper-50))"
          strokeWidth="3"
          style={{ transition: 'fill 600ms ease' }}
        />

        {grade ? (
          <text
            x="170"
            y="185"
            textAnchor="middle"
            className="font-display"
            fontSize="86"
            fontWeight={700}
            fill="rgb(var(--paper-50))"
          >
            {grade}
          </text>
        ) : (
          <>
            <text
              x="170"
              y="173"
              textAnchor="middle"
              className="font-display"
              fontSize="62"
              fontWeight={700}
              fill="rgb(var(--paper-50))"
            >
              L
              <tspan fill="rgb(var(--peach-300))" dx="3">
                M
              </tspan>
            </text>
            <line
              x1="132"
              y1="190"
              x2="208"
              y2="190"
              stroke="rgb(var(--brick-600))"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        )}
      </g>

      {/* small caption plate below when graded */}
      {grade && (
        <text
          x="170"
          y="250"
          textAnchor="middle"
          className="font-mono"
          fontSize="14"
          fill="rgb(var(--charcoal-700))"
        >
          your site
        </text>
      )}
    </svg>
  );
}
