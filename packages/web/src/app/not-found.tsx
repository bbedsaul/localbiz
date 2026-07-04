import { Button } from '@/components/ui';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper-50 px-5 text-center">
      <div>
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <p className="font-display text-6xl font-bold text-green-900">404</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">We couldn&rsquo;t find that page</h1>
        <p className="mt-2 text-charcoal-700">It may have moved. Let&rsquo;s get you back on track.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button href="/">Back home</Button>
          <Button href="/#services" variant="outline">
            See services
          </Button>
        </div>
      </div>
    </main>
  );
}
