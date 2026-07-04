'use client';

import { useState } from 'react';
import { buttonClass } from '@/components/ui';

export function WaitlistInline({ service }: { service: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState('saving');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), service }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return <p className="font-medium text-green-900">Thanks — we&rsquo;ll email you the moment it opens.</p>;
  }

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-2 sm:flex-row">
      <label htmlFor={`wl-${service}`} className="sr-only">
        Email
      </label>
      <input
        id={`wl-${service}`}
        type="email"
        required
        placeholder="you@yourbusiness.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === 'saving'}
        className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-green-900 focus:outline-none focus:ring-2 focus:ring-green-900/20"
      />
      <button className={buttonClass({ size: 'md' })} disabled={state === 'saving'}>
        {state === 'saving' ? 'Adding…' : 'Join the waitlist'}
      </button>
      {state === 'error' && <span className="text-sm text-brick-700">Try again in a moment.</span>}
    </form>
  );
}
