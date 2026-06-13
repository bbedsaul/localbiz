import { prioritizeIssues } from 'sitevitals-engine';
import { CategoryBars } from '@/components/dashboard/CategoryBars';
import { getLatestScan, getPrimaryBusiness } from '@/lib/dashboard';

export default async function ChecksPage() {
  const business = (await getPrimaryBusiness())!;
  const scan = await getLatestScan(business.id);

  if (!scan) {
    return (
      <div className="card p-8 text-center">
        <p className="font-medium text-ink">No full scan yet</p>
        <p className="mt-1 text-ink-soft">Your detailed findings appear here after the first scan.</p>
      </div>
    );
  }

  const { wins, issues } = prioritizeIssues(scan);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">What we found</h1>
        <p className="text-ink-faint">In plain English, ordered by what matters most.</p>
      </div>

      <div className="card p-6">
        <p className="mb-4 text-sm font-semibold text-ink">Category scores</p>
        <CategoryBars categories={scan.scores.categories} />
      </div>

      {wins.length > 0 && (
        <div className="card p-6">
          <p className="mb-3 text-sm font-semibold text-ink">What&rsquo;s going well</p>
          <ul className="space-y-2.5">
            {wins.map((w) => (
              <li key={w.id} className="flex gap-2.5 text-sm text-ink-soft">
                <span className="mt-0.5 text-brand-500">✓</span>
                {w.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card divide-y divide-line">
        <p className="px-6 pt-6 text-sm font-semibold text-ink">
          Worth your attention ({issues.length})
        </p>
        {issues.length === 0 ? (
          <p className="px-6 py-5 text-sm text-ink-soft">Nothing needs fixing right now. Nice.</p>
        ) : (
          issues.map((issue, i) => (
            <div key={`${issue.id}-${i}`} className="px-6 py-5">
              <p className="font-semibold text-ink">{issue.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{issue.detail}</p>
              <p className="mt-1 text-sm italic text-ink-faint">Why it matters: {issue.why}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
