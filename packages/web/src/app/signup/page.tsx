import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export const metadata: Metadata = { title: 'Start free trial' };

/**
 * Signup entry. SiteVitals runs the scan-before-pay flow (the aha-moment before
 * checkout). Websites is concierge — no Stripe — so it hands off to the request
 * form.
 */
export default function SignupPage({
  searchParams,
}: {
  searchParams: { service?: string };
}) {
  const service = searchParams.service ?? 'sitevitals';
  if (service === 'websites') redirect('/services/websites');

  return (
    <main className="min-h-dvh bg-paper-50">
      <header className="container-page py-5">
        <Logo />
      </header>
      <div className="container-page py-6 sm:py-10">
        <Suspense fallback={<p className="text-center text-ink-faint">Loading…</p>}>
          <OnboardingFlow />
        </Suspense>
      </div>
    </main>
  );
}
