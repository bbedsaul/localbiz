import type { LetterGrade } from 'sitevitals-engine';
import { GRADE_HEX } from '@/lib/format';

const SIZES = { sm: 44, md: 72, lg: 112 } as const;

export function GradeBadge({
  grade,
  size = 'md',
}: {
  grade: LetterGrade;
  size?: keyof typeof SIZES;
}) {
  const px = SIZES[size];
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: px,
        height: px,
        background: GRADE_HEX[grade],
        fontSize: px * 0.46,
      }}
      aria-label={`Health grade ${grade}`}
    >
      {grade}
    </div>
  );
}
