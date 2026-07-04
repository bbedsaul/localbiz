'use client';

import { Button, buttonClass } from '@/components/ui';
import { Logo } from '@/components/Logo';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper-50 px-5 text-center">
      <div>
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <p className="font-display text-5xl font-bold text-brick-600">Something broke</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Sorry — that didn&rsquo;t work</h1>
        <p className="mt-2 text-charcoal-700">Give it another try, or head back home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className={buttonClass({ variant: 'secondary', size: 'md' })}>
            Try again
          </button>
          <Button href="/" variant="outline">
            Back home
          </Button>
        </div>
      </div>
    </main>
  );
}
