import { getPrimaryBusiness, getReports } from '@/lib/dashboard';
import { periodLabel } from '@/lib/format';

export default async function ReportsPage() {
  const business = (await getPrimaryBusiness())!;
  const reports = await getReports(business.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Your reports</h1>
        <p className="text-ink-faint">Every monthly report card we&rsquo;ve sent you.</p>
      </div>

      {reports.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-medium text-ink">No reports yet</p>
          <p className="mt-1 text-ink-soft">
            Your first report card arrives by email at the start of next month.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r, i) => (
            <details key={r.id} className="card overflow-hidden" open={i === 0}>
              <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-medium text-ink">
                <span>{periodLabel(r.period)}</span>
                <span className="text-sm font-normal text-ink-faint">
                  {r.sent_at ? `Sent · ${r.opened_at ? 'opened' : 'delivered'}` : 'Not sent'}
                </span>
              </summary>
              <iframe
                title={`Report for ${r.period}`}
                srcDoc={r.html}
                className="h-[640px] w-full border-t border-line bg-canvas"
              />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
