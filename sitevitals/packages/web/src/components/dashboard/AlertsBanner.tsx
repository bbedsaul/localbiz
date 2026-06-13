import type { AlertRow } from '@/lib/dashboard';

export function AlertsBanner({ alerts }: { alerts: AlertRow[] }) {
  if (alerts.length === 0) {
    return (
      <div className="card flex items-center gap-3 border-brand-100 bg-brand-50 p-4">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-brand-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="text-sm font-medium text-brand-700">All clear — nothing needs your attention.</p>
      </div>
    );
  }
  return (
    <div className="card border-grade-f/30 bg-red-50 p-4">
      <p className="mb-2 text-sm font-bold text-grade-f">
        {alerts.length} {alerts.length === 1 ? 'issue needs' : 'issues need'} attention
      </p>
      <ul className="space-y-1.5">
        {alerts.map((a) => (
          <li key={a.id} className="text-sm text-ink-soft">
            {a.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
