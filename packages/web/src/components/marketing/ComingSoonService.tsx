import { Section, Container, Card, Badge } from '@/components/ui';
import { WaitlistInline } from './WaitlistInline';

export interface ComingSoonServiceProps {
  serviceKey: string;
  name: string;
  price: string;
  pitch: string;
  features: { title: string; body: string }[];
}

export function ComingSoonService({ serviceKey, name, price, pitch, features }: ComingSoonServiceProps) {
  return (
    <>
      <Section tone="paper">
        <Container>
          <div className="max-w-prose">
            <Badge tone="neutral">Coming soon · {price}</Badge>
            <h1 className="mt-4 text-4xl font-bold text-green-900 sm:text-5xl">{name}</h1>
            <p className="mt-4 text-lg text-charcoal-700">{pitch}</p>
            <div className="mt-6">
              <WaitlistInline service={serviceKey} />
            </div>
          </div>
        </Container>
      </Section>
      <Section tone="panel">
        <Container>
          <h2 className="text-3xl font-bold text-green-900">What it&rsquo;ll do for you</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="p-6">
                <h3 className="font-bold text-green-900">{f.title}</h3>
                <p className="mt-1 text-sm text-charcoal-700">{f.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
