'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useInstantScan } from '@/components/useInstantScan';
import { GradeBadge } from '@/components/GradeBadge';
import { Signboard } from '@/components/marketing/Signboard';
import { Button, buttonClass } from '@/components/ui';
import { gradeWord } from '@/lib/format';
import { cn } from '@/lib/cn';

const STATUS_MARK: Record<string, string> = { running: '…', ok: '✓', error: '!', skipped: '–' };
const STATUS_COLOR: Record<string, string> = {
  running: 'text-charcoal-500',
  ok: 'text-green-700',
  error: 'text-brick-600',
  skipped: 'text-charcoal-500',
};

export function Hero() {
  const [value, setValue] = useState('');
  const { status, checks, result, error, start, reset } = useInstantScan();

  const isLimit = !!error && /free scans/i.test(error);
  const branch: 'sitevitals' | 'websites' | null =
    status === 'done'
      ? result!.grade === 'F'
        ? 'websites'
        : 'sitevitals'
      : status === 'error' && !isLimit
        ? 'websites'
        : null;

  return (
    <section className="relative overflow-hidden bg-paper-50">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: pitch + the free scan */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-900">
            Free 30-second check
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] text-green-900 sm:text-5xl lg:text-6xl">
            We handle the internet.
            <br />
            You handle the business.
          </h1>
          <p className="mt-5 max-w-prose text-lg text-charcoal-700">
            LocalMarket keeps your website working and your business easy to find online — so you
            can get back to the actual work. Start with a free health check of your site.
          </p>

          <form
            className="mt-7 flex flex-col gap-2.5 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim()) start(value);
            }}
          >
            <label htmlFor="scan-url" className="sr-only">
              Your website address
            </label>
            <input
              id="scan-url"
              name="url"
              inputMode="url"
              autoComplete="url"
              placeholder="yourbusiness.com"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={status === 'scanning'}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-green-900 focus:outline-none focus:ring-2 focus:ring-green-900/20 sm:flex-1"
            />
            <Button type="submit" size="lg" disabled={status === 'scanning'}>
              {status === 'scanning' ? 'Scanning…' : 'Scan my site free'}
            </Button>
          </form>
          <p className="mt-2 text-sm text-charcoal-500">3 free scans a day · no signup needed</p>

          {/* Live progress — reads like a work invoice */}
          {status === 'scanning' && (
            <ul className="mt-6 space-y-1.5 font-mono text-sm">
              {checks.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-3">
                  <span className="text-charcoal-700">{c.label}</span>
                  <span className={cn('flex items-center gap-2', STATUS_COLOR[c.status])}>
                    <span className="text-charcoal-500">{c.summary}</span>
                    <span aria-hidden className="w-3 text-right font-semibold">
                      {STATUS_MARK[c.status]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Rate-limit or unreachable message (unreachable also branches below) */}
          {status === 'error' && isLimit && (
            <p className="mt-6 rounded-xl border border-line bg-paper-100 px-4 py-3 text-sm text-charcoal-700">
              {error}
            </p>
          )}

          {/* Branched result */}
          {branch === 'sitevitals' && result && (
            <div className="mt-7 rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center gap-4">
                <GradeBadge grade={result.grade} size="md" />
                <div>
                  <p className="font-display text-xl font-bold text-green-900">
                    Your site scored {result.grade} — {gradeWord(result.grade).toLowerCase()}.
                  </p>
                  <p className="text-sm text-charcoal-700">
                    That’s {result.measuredCount} of 20+ checks. Get the full report card and monthly
                    monitoring so you know the moment something breaks.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href={`/signup?service=sitevitals&url=${encodeURIComponent(value)}`}>
                  See my full report
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setValue('');
                  }}
                  className={buttonClass({ variant: 'ghost', size: 'md' })}
                >
                  Scan another
                </button>
              </div>
            </div>
          )}

          {branch === 'websites' && (
            <div className="mt-7 rounded-2xl border border-line bg-surface p-5 shadow-card">
              <p className="font-display text-xl font-bold text-brick-700">
                {status === 'done' ? 'Your site needs real help.' : 'We couldn’t find a working site there.'}
              </p>
              <p className="mt-1 text-sm text-charcoal-700">
                We build professional websites for local businesses — design, copy, domain, and
                hosting, live in days. Every one includes 3 months of monitoring free.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="/signup?service=websites">Request my website</Button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setValue('');
                  }}
                  className={buttonClass({ variant: 'ghost', size: 'md' })}
                >
                  Try another address
                </button>
              </div>
            </div>
          )}

          {status === 'idle' && (
            <p className="mt-7 text-sm text-charcoal-500">
              Not sure you have a site?{' '}
              <Link href="/signup?service=websites" className="font-semibold text-brick-600 underline">
                We’ll build you one.
              </Link>
            </p>
          )}
        </div>

        {/* Right: the living signboard */}
        <div className="flex justify-center lg:justify-end">
          <Signboard grade={result?.grade ?? null} />
        </div>
      </div>
    </section>
  );
}
