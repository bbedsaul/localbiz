import { Container, Section } from '@/components/ui';
import { ServiceShingle, type LiveService } from './ServiceShingle';
import { WaitlistShingle, type ComingService } from './WaitlistShingle';

const LIVE: LiveService[] = [
  {
    name: 'Websites',
    tagline: 'A professional site, built for you — live in days.',
    control: 'You approve the look. We handle design, copy, your domain, and hosting.',
    href: '/services/websites',
    cta: 'Request my website',
    accent: 'brick',
  },
  {
    name: 'SiteVitals',
    tagline: 'Know the moment your website has a problem.',
    control: 'A plain-English report card every month, plus an alert the instant it goes down.',
    href: '/services/sitevitals',
    cta: 'See how it works',
    accent: 'green',
  },
];

const COMING: ComingService[] = [
  { key: 'callback', name: 'CallBack', tagline: 'Miss a call, we text the caller back — so you never lose the job.' },
  { key: 'reviews', name: 'Reviews', tagline: 'Turn happy customers into 5-star reviews, automatically.' },
  { key: 'social', name: 'Social', tagline: 'Stay posted on social without lifting a finger.' },
];

export function ServicesWall() {
  return (
    <Section id="services" tone="panel">
      <Container>
        <div className="max-w-prose">
          <h2 className="text-3xl font-bold text-green-900 sm:text-4xl">One shop. Every sign.</h2>
          <p className="mt-3 text-lg text-charcoal-700">
            LocalMarket is a family of services that run the online side of your business. Start with
            what you need today; the rest are on the way.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LIVE.map((s) => (
            <ServiceShingle key={s.name} service={s} />
          ))}
          {COMING.map((s) => (
            <WaitlistShingle key={s.key} service={s} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
