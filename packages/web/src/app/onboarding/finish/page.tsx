'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { createBusiness, type OnboardingPayload } from '@/actions/business';
import { createCheckout } from '@/actions/billing';

const STORAGE_KEY = 'sitevitals_onboarding';

export default function FinishPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        router.replace('/dashboard');
        return;
      }
      const payload = JSON.parse(raw) as OnboardingPayload;
      const result = await createBusiness(payload);
      if (!result.ok || !result.businessId) {
        setError(result.error ?? 'Something went wrong creating your account.');
        return;
      }
      window.localStorage.removeItem(STORAGE_KEY);

      // Card-required trial: hand off to Stripe Checkout if configured.
      const checkout = await createCheckout(result.businessId, payload.plan ?? 'solo');
      if (checkout.url) {
        window.location.href = checkout.url;
      } else {
        router.replace('/dashboard?welcome=1');
      }
    })();
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        {error ? (
          <>
            <p className="text-ink">{error}</p>
            <a href="/onboarding" className="btn-secondary mt-4">
              Start over
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-500" />
            <p className="mt-4 text-ink-soft">Setting up your account…</p>
          </>
        )}
      </div>
    </main>
  );
}
