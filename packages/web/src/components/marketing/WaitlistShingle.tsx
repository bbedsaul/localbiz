'use client';

import { useState } from 'react';
import { Badge, buttonClass } from '@/components/ui';

export interface ComingService {
  key: string;
  name: string;
  tagline: string;
}

/** A "coming soon" service — an unpainted plate that collects emails. */
export function WaitlistShingle({ service }: { service: ComingService }) {
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
        body: JSON.stringify({ email: email.trim(), service: service.key }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <article className="flex flex-col rounded-2xl border border-dashed border-charcoal-500/35 bg-paper-100 p-6">
      <Badge tone="neutral">Coming soon</Badge>
      <h3 className="mt-3 text-2xl font-bold text-charcoal-700">{service.name}</h3>
      <p className="mt-1 flex-1 text-charcoal-500">{service.tagline}</p>

      {state === 'done' ? (
        <p className="mt-5 text-sm font-medium text-green-900">
          Thanks — we’ll email you the moment {service.name} opens up.
        </p>
      ) : (
        <form className="mt-5 flex flex-col gap-2" onSubmit={submit}>
          <label htmlFor={`wl-${service.key}`} className="sr-only">
            Email for {service.name} waitlist
          </label>
          <input
            id={`wl-${service.key}`}
            type="email"
            required
            placeholder="you@yourbusiness.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === 'saving'}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-green-900 focus:outline-none focus:ring-2 focus:ring-green-900/20"
          />
          <button
            type="submit"
            disabled={state === 'saving'}
            className={buttonClass({ variant: 'outline', size: 'sm' })}
          >
            {state === 'saving' ? 'Adding you…' : 'Notify me'}
          </button>
          {state === 'error' && (
            <p className="text-xs text-brick-700">Something went wrong — try again in a moment.</p>
          )}
        </form>
      )}
    </article>
  );
}
