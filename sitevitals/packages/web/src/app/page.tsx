import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { HeroScan } from '@/components/landing/HeroScan';
import { Pricing } from '@/components/landing/Pricing';
import { SampleReport } from '@/components/landing/SampleReport';

const STEPS = [
  {
    n: '1',
    title: 'Tell us your website',
    body: 'Enter your address, business type, and city. Takes about a minute.',
  },
  {
    n: '2',
    title: 'We watch it around the clock',
    body: 'Uptime, speed, security, Google ranking, and your listings — checked automatically.',
  },
  {
    n: '3',
    title: 'You get a plain-English report',
    body: 'A simple A–F grade by email each month, plus instant alerts if something breaks.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="container-page flex items-center justify-between py-5">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/onboarding" className="btn-primary px-4 py-2 text-sm sm:text-base">
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container-page grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">
            Know your website is working — without thinking about it.
          </h1>
          <p className="mt-5 max-w-prose text-lg text-ink-soft">
            SiteVitals quietly checks your website and online listings every day, then emails you a
            simple report card. No dashboards to babysit. We&rsquo;ll tell you the moment something
            needs fixing.
          </p>
          <div className="mt-7">
            <HeroScan />
          </div>
        </div>
        <div className="hidden lg:block">
          <SampleReport />
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-surface py-14">
        <div className="container-page">
          <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
            Set it up once. Stop worrying.
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample report on mobile */}
      <section className="container-page py-14 lg:hidden">
        <h2 className="mb-8 text-center text-2xl font-bold text-ink">
          A report a human can actually read
        </h2>
        <SampleReport />
      </section>

      {/* Pricing */}
      <section id="pricing" className="container-page py-14">
        <div className="mx-auto mb-10 max-w-prose text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Simple pricing</h2>
          <p className="mt-2 text-ink-soft">
            14-day free trial. Cancel anytime. Your first report is on us.
          </p>
        </div>
        <Pricing />
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <Logo />
          <p className="text-sm text-ink-faint">
            © {new Date().getFullYear()} SiteVitals. Built for local businesses.
          </p>
        </div>
      </footer>
    </main>
  );
}
