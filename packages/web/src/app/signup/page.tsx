import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import { Button, Badge } from '@/components/ui';

export const metadata: Metadata = { title: 'Start free trial' };

const LABELS: Record<string, string> = {
  sitevitals: 'SiteVitals monitoring',
  websites: 'a new website',
};

// Stub — the real signup + Stripe flow is built in Session W2.
export default function SignupStub({
  searchParams,
}: {
  searchParams: { service?: string; plan?: string };
}) {
  const service = searchParams.service ?? 'sitevitals';
  const label = LABELS[service] ?? service;
  return (
    <main className="grid min-h-dvh place-items-center bg-paper-50 px-5">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="mt-8">
          <Badge tone="brick">Coming in the next build</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-green-900">Start free trial</h1>
        <p className="mt-3 text-charcoal-700">
          Signup for <span className="font-semibold text-green-900">{label}</span> is being built —
          it lands with accounts and checkout in the next session.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button href="/">Back home</Button>
          <Button href="/login" variant="outline">
            Sign in
          </Button>
        </div>
      </div>
    </main>
  );
}
