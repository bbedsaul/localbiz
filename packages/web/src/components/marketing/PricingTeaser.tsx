import { Container, Section, Card, Badge, Button } from '@/components/ui';

const TIERS = [
  {
    name: 'Solo',
    price: '$29',
    per: '/mo',
    blurb: 'One website, full monitoring, monthly report card.',
    plan: 'solo',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$49',
    per: '/mo',
    blurb: 'Everything in Solo, plus faster checks and priority alerts.',
    plan: 'pro',
    featured: true,
  },
];

export function PricingTeaser() {
  return (
    <Section id="pricing" tone="paper">
      <Container>
        <div className="max-w-prose">
          <h2 className="text-3xl font-bold text-green-900 sm:text-4xl">Simple, honest pricing</h2>
          <p className="mt-3 text-lg text-charcoal-700">
            Start free. SiteVitals monitoring is a flat monthly rate — no per-check surprises.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={tier.featured ? 'relative border-green-900 p-6' : 'relative p-6'}
            >
              {tier.featured && (
                <span className="absolute right-5 top-5">
                  <Badge tone="green">Most popular</Badge>
                </span>
              )}
              <h3 className="text-xl font-bold text-green-900">{tier.name}</h3>
              <p className="mt-2">
                <span className="font-display text-4xl font-bold text-green-900">{tier.price}</span>
                <span className="text-charcoal-500">{tier.per}</span>
              </p>
              <p className="mt-2 text-sm text-charcoal-700">{tier.blurb}</p>
              <Button
                href={`/signup?service=sitevitals&plan=${tier.plan}`}
                variant={tier.featured ? 'primary' : 'outline'}
                className="mt-5 w-full"
              >
                Start free trial
              </Button>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-sm text-charcoal-500">
          Need a website too? Websites start from{' '}
          <span className="font-mono text-charcoal-700">$X setup + $Y/mo</span> hosting (placeholder
          pricing) —{' '}
          <a href="/services/websites" className="font-semibold text-brick-600 underline">
            request a quote
          </a>
          .
        </p>
      </Container>
    </Section>
  );
}
