import type { Metadata } from 'next';
import Link from 'next/link';
import { Section, Container, Card, Badge } from '@/components/ui';
import { SiteVitalsPricing } from '@/components/marketing/SiteVitalsPricing';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, honest pricing for every LocalMarket service. Start free.',
};

const COMING = [
  { name: 'CallBack', price: '$39/mo', href: '/services/callback' },
  { name: 'Reviews', price: '$49/mo', href: '/services/reviews' },
  { name: 'Social', price: '$49/mo', href: '/services/social' },
];

export default function PricingPage() {
  return (
    <>
      <Section tone="paper">
        <Container>
          <div className="max-w-prose">
            <h1 className="text-4xl font-bold text-green-900 sm:text-5xl">Simple, honest pricing</h1>
            <p className="mt-4 text-lg text-charcoal-700">
              Start free. Flat monthly rates, no per-check surprises, cancel anytime.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="panel">
        <Container>
          <h2 className="text-2xl font-bold text-green-900">SiteVitals — website monitoring</h2>
          <div className="mt-6">
            <SiteVitalsPricing />
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container>
          <h2 className="text-2xl font-bold text-green-900">Websites — built for you</h2>
          <Card className="mt-6 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-green-900">Professional website</p>
              <p className="text-sm text-charcoal-700">
                From <span className="font-mono">$X setup + $Y/mo</span> hosting (concierge — we quote you exactly).
              </p>
            </div>
            <Link href="/services/websites" className="font-semibold text-brick-600 hover:underline">
              Request a quote →
            </Link>
          </Card>
        </Container>
      </Section>

      <Section tone="panel">
        <Container>
          <h2 className="text-2xl font-bold text-green-900">Coming soon</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {COMING.map((s) => (
              <Card key={s.name} className="flex items-center justify-between p-5">
                <div>
                  <p className="font-semibold text-green-900">{s.name}</p>
                  <p className="text-sm text-charcoal-500">{s.price}</p>
                </div>
                <Link href={s.href} className="text-sm font-semibold text-brick-600 hover:underline">
                  Waitlist →
                </Link>
              </Card>
            ))}
          </div>
          <Card className="mt-5 flex flex-col items-start justify-between gap-3 border-green-900/30 p-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-green-900">LocalMarket Complete</p>
                <Badge tone="neutral">Coming soon</Badge>
              </div>
              <p className="mt-1 text-sm text-charcoal-700">Every service, one bundle.</p>
            </div>
            <p>
              <span className="font-display text-3xl font-bold text-green-900">$299</span>
              <span className="text-charcoal-500">/mo</span>
            </p>
          </Card>
        </Container>
      </Section>
    </>
  );
}
