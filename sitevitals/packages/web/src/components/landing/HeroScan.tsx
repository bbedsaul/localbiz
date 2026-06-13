'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GradeBadge } from '@/components/GradeBadge';
import { ScanProgress } from '@/components/ScanProgress';
import { useInstantScan } from '@/components/useInstantScan';
import { gradeWord, prettyHost } from '@/lib/format';

export function HeroScan() {
  const [url, setUrl] = useState('');
  const { status, checks, result, error, start, reset } = useInstantScan();

  return (
    <div className="card p-5 sm:p-7">
      {status === 'idle' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(url);
          }}
        >
          <label htmlFor="hero-url" className="label">
            Enter your website address
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="hero-url"
              className="field flex-1"
              placeholder="yourbusiness.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="url"
              inputMode="url"
            />
            <button type="submit" className="btn-primary" disabled={!url.trim()}>
              Scan my site free
            </button>
          </div>
          <p className="mt-3 text-sm text-ink-faint">
            Free, instant, no signup. We check the basics in a few seconds.
          </p>
        </form>
      )}

      {(status === 'scanning' || status === 'done') && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-ink-soft">
              Scanning <span className="text-ink">{prettyHost(url)}</span>
            </p>
            {status === 'done' && (
              <button onClick={reset} className="text-sm font-medium text-brand-600 hover:underline">
                Scan another
              </button>
            )}
          </div>
          <ScanProgress checks={checks} />

          {status === 'done' && result && (
            <div className="mt-5 rounded-xl bg-canvas p-5">
              <div className="flex items-center gap-4">
                <GradeBadge grade={result.grade} size="md" />
                <div>
                  <p className="text-sm text-ink-faint">Quick health grade</p>
                  <p className="text-xl font-bold text-ink">
                    {result.grade} — {gradeWord(result.grade)}
                  </p>
                  <p className="text-sm text-ink-soft">
                    Based on {result.measuredCount} of 7 areas. The rest — Google ranking,
                    listings, page speed — are in your full report.
                  </p>
                </div>
              </div>
              <Link
                href={`/onboarding?url=${encodeURIComponent(url)}`}
                className="btn-primary mt-5 w-full"
              >
                Get my full report card →
              </Link>
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <p className="text-ink">{error}</p>
          <button onClick={reset} className="btn-secondary mt-4">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
