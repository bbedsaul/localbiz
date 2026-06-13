'use client';

import { useState } from 'react';
import { createPortal } from '@/actions/billing';

export function ManageBillingButton({ businessId }: { businessId: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setNote(null);
    const { url } = await createPortal(businessId);
    setBusy(false);
    if (url) window.location.href = url;
    else setNote('Billing portal isn’t available yet — finish setting up payments to manage your plan.');
  }

  return (
    <div>
      <button onClick={open} className="btn-primary" disabled={busy}>
        {busy ? 'Opening…' : 'Manage billing'}
      </button>
      {note && <p className="mt-3 text-sm text-ink-faint">{note}</p>}
    </div>
  );
}
