'use client';

import { useState, useTransition } from 'react';
import { resendReport } from '@/actions/reports';
import { buttonClass } from '@/components/ui';

export function ResendReportButton({ reportId }: { reportId: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-3">
      {state === 'done' && <span className="text-sm font-medium text-green-700">Sent ✓</span>}
      {state === 'error' && <span className="text-sm text-brick-700">{msg}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await resendReport(reportId);
            setState(r.ok ? 'done' : 'error');
            setMsg(r.error ?? '');
          })
        }
        className={buttonClass({ variant: 'outline', size: 'sm' })}
      >
        {pending ? 'Sending…' : 'Resend to my email'}
      </button>
    </div>
  );
}
