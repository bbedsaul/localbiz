import { Suspense } from 'react';
import { Logo } from '@/components/Logo';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export default function OnboardingPage() {
  return (
    <main className="min-h-screen">
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
