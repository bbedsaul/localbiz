'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink">Check your email</h1>
        <p className="mt-2 text-ink-soft">
          We sent a secure sign-in link to <strong>{email}</strong>. Click it to continue — no
          password needed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h1 className="text-2xl font-bold text-ink">Sign in</h1>
      <p className="mt-2 text-ink-soft">We&rsquo;ll email you a secure link. No password to remember.</p>
      <label htmlFor="email" className="label mt-6">
        Email address
      </label>
      <input
        id="email"
        type="email"
        required
        className="field"
        placeholder="you@yourbusiness.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      {error && <p className="mt-3 text-sm text-grade-f">{error}</p>}
      {params.get('error') === 'link_expired' && !error && (
        <p className="mt-3 text-sm text-grade-f">That link expired. Enter your email for a new one.</p>
      )}
      <button type="submit" className="btn-primary mt-5 w-full" disabled={busy || !email}>
        {busy ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-7">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
