import type { CategoryScore } from 'sitevitals-engine';

function barColor(score: number): string {
  if (score >= 90) return '#2E7D32';
  if (score >= 80) return '#558B2F';
  if (score >= 70) return '#F9A825';
  if (score >= 60) return '#EF6C00';
  return '#C62828';
}

export function CategoryBars({ categories }: { categories: CategoryScore[] }) {
  return (
    <ul className="space-y-3.5">
      {categories.map((c) => (
        <li key={c.id}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink">{c.label}</span>
            <span className="text-ink-faint">
              {c.score === null ? 'Not yet measured' : c.score}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            {c.score !== null && (
              <div
                className="h-full rounded-full"
                style={{ width: `${c.score}%`, background: barColor(c.score) }}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
