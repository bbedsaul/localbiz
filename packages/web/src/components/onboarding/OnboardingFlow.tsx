'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GradeBadge } from '@/components/GradeBadge';
import { ScanProgress } from '@/components/ScanProgress';
import { useInstantScan } from '@/components/useInstantScan';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES } from '@/lib/categories';
import { gradeWord, normalizeUrl, prettyHost } from '@/lib/format';
import { Progress } from './Progress';

const STORAGE_KEY = 'sitevitals_onboarding';

type Step = 0 | 1 | 2 | 3 | 4;

interface Listing {
  source: string;
  found: boolean;
  name: string | null;
  unavailable: boolean;
}

function deriveName(url: string): string {
  try {
    const host = new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
    const base = host.split('.')[0] ?? host;
    return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  } catch {
    return '';
  }
}

export function OnboardingFlow() {
  const params = useSearchParams();
  const [step, setStep] = useState<Step>(0);

  const [url, setUrl] = useState(params.get('url') ?? '');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const plan = (params.get('plan') === 'pro' ? 'pro' : 'solo') as 'solo' | 'pro';

  const scan = useInstantScan();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const go = (s: Step) => setStep(s);

  async function submitSite(e: React.FormEvent) {
    e.preventDefault();
    if (!name) setName(deriveName(url));
    go(1);
    setDiscovering(true);
    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, name: name || deriveName(url), category, city }),
      });
      const data = (await res.json()) as { listings: Listing[]; keywords: string[] };
      setListings(data.listings ?? []);
      setKeywords((data.keywords ?? []).slice(0, 5));
    } catch {
      setListings([]);
    } finally {
      setDiscovering(false);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const payload = { url: normalizeUrl(url), name: name || deriveName(url), category, city, keywords, plan };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/onboarding/finish')}`,
      },
    });
    if (error) setAuthError(error.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Progress current={step} />
      <div className="card mt-6 p-6 sm:p-8">
        {/* a. site */}
        {step === 0 && (
          <form onSubmit={submitSite} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-ink">Let&rsquo;s find your website</h2>
              <p className="mt-1 text-ink-soft">A minute of setup, then we handle the rest.</p>
            </div>
            <div>
              <label className="label">Website address</label>
              <input
                className="field"
                placeholder="yourbusiness.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                inputMode="url"
              />
            </div>
            <div>
              <label className="label">Business name</label>
              <input
                className="field"
                placeholder={deriveName(url) || 'Bloom Floral Co.'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Business type</label>
                <select className="field" value={category} onChange={(e) => setCategory(e.target.value)} required>
                  <option value="" disabled>
                    Choose…
                  </option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">City</label>
                <input
                  className="field"
                  placeholder="Austin"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={!url || !category || !city}>
              Continue
            </button>
          </form>
        )}

        {/* b. discovery */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-ink">Your online listings</h2>
              <p className="mt-1 text-ink-soft">
                We look for your business on Google, Yelp, and Facebook so we can watch them too.
              </p>
            </div>
            {discovering ? (
              <p className="py-6 text-center text-ink-faint">Looking you up…</p>
            ) : listings.some((l) => l.found) ? (
              <ul className="divide-y divide-line">
                {listings
                  .filter((l) => l.found)
                  .map((l) => (
                    <li key={l.source} className="flex items-center justify-between py-3">
                      <span className="font-medium capitalize text-ink">{l.source}</span>
                      <span className="text-sm text-ink-soft">{l.name ?? 'Found'}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="rounded-xl bg-canvas p-4 text-sm text-ink-soft">
                We&rsquo;ll find and confirm your Google, Yelp, and Facebook listings during your
                first full report. You can review them anytime in settings.
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => go(0)} className="btn-secondary flex-1">
                Back
              </button>
              <button onClick={() => go(2)} className="btn-primary flex-1">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* c. keywords */}
        {step === 2 && (
          <KeywordStep
            keywords={keywords}
            setKeywords={setKeywords}
            onBack={() => go(1)}
            onNext={() => {
              go(3);
              scan.start(url);
            }}
          />
        )}

        {/* d. instant scan */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-ink">Your instant health check</h2>
              <p className="mt-1 text-ink-soft">
                Scanning <span className="font-medium text-ink">{prettyHost(url)}</span> right now.
              </p>
            </div>
            <ScanProgress checks={scan.checks} />
            {scan.status === 'done' && scan.result && (
              <div className="rounded-xl bg-canvas p-5">
                <div className="flex items-center gap-4">
                  <GradeBadge grade={scan.result.grade} size="md" />
                  <div>
                    <p className="text-lg font-bold text-ink">
                      {scan.result.grade} — {gradeWord(scan.result.grade)}
                    </p>
                    <p className="text-sm text-ink-soft">
                      That&rsquo;s the basics. Your full report adds Google ranking, listings, and
                      page speed.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => go(4)}
              className="btn-primary w-full"
              disabled={scan.status === 'scanning'}
            >
              {scan.status === 'scanning' ? 'Scanning…' : 'Start my free trial →'}
            </button>
          </div>
        )}

        {/* e. signup */}
        {step === 4 && (
          <div>
            {sent ? (
              <div className="text-center">
                <h2 className="text-xl font-bold text-ink">Check your email</h2>
                <p className="mt-2 text-ink-soft">
                  We sent a secure link to <strong>{email}</strong>. Click it to finish setting up
                  your {plan === 'pro' ? 'Pro' : 'Solo'} trial — no password needed.
                </p>
              </div>
            ) : (
              <form onSubmit={sendMagicLink} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-ink">Start your 14-day trial</h2>
                  <p className="mt-1 text-ink-soft">
                    {plan === 'pro' ? 'Pro' : 'Solo'} plan · ${plan === 'pro' ? 49 : 29}/mo after the
                    trial. We&rsquo;ll email a secure link to create your account.
                  </p>
                </div>
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email"
                    className="field"
                    placeholder="you@yourbusiness.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                {authError && <p className="text-sm text-grade-f">{authError}</p>}
                <button type="submit" className="btn-primary w-full" disabled={!email}>
                  Email me my sign-in link
                </button>
                <p className="text-center text-xs text-ink-faint">
                  14-day free trial. Card collected at the next step. Cancel anytime.
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KeywordStep({
  keywords,
  setKeywords,
  onBack,
  onNext,
}: {
  keywords: string[];
  setKeywords: (k: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim().toLowerCase();
    if (v && keywords.length < 5 && !keywords.includes(v)) {
      setKeywords([...keywords, v]);
      setDraft('');
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ink">Searches you want to win</h2>
        <p className="mt-1 text-ink-soft">
          We track where you rank on Google for these. Edit them — up to 5.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
            {k}
            <button onClick={() => setKeywords(keywords.filter((x) => x !== k))} aria-label={`Remove ${k}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      {keywords.length < 5 && (
        <div className="flex gap-2">
          <input
            className="field flex-1"
            placeholder="e.g. emergency plumber austin"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <button onClick={add} className="btn-secondary" type="button">
            Add
          </button>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">
          Back
        </button>
        <button onClick={onNext} className="btn-primary flex-1">
          Run my instant scan
        </button>
      </div>
    </div>
  );
}
