'use client';

import type { CheckLine } from './useInstantScan';

function Icon({ status }: { status: CheckLine['status'] }) {
  if (status === 'running') {
    return (
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand-500" aria-hidden />
    );
  }
  if (status === 'ok') {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-50 text-brand-600" aria-hidden>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-red-50 text-grade-f" aria-hidden>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return <span className="h-5 w-5 rounded-full border border-line" aria-hidden />;
}

export function ScanProgress({ checks }: { checks: CheckLine[] }) {
  return (
    <ul className="divide-y divide-line">
      {checks.map((c) => (
        <li key={c.name} className="flex items-center gap-3 py-3">
          <Icon status={c.status} />
          <span className="flex-1 text-sm font-medium text-ink">{c.label}</span>
          <span className="text-right text-sm text-ink-faint">{c.summary}</span>
        </li>
      ))}
    </ul>
  );
}
