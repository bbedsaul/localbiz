import { Container, Section } from '@/components/ui';

const STEPS = [
  {
    title: 'Tell us your website',
    body: 'Type your address for a free 30-second check — no signup. We show you where you stand.',
  },
  {
    title: 'We watch it around the clock',
    body: 'Uptime, speed, security, and how you show up in search — checked automatically, every day.',
  },
  {
    title: 'You get a plain-English report',
    body: 'A monthly report card, and an alert the instant something breaks. You only hear from us when it matters.',
  },
];

export function HowItWorks() {
  return (
    <Section id="how" tone="paper">
      <Container>
        <h2 className="text-3xl font-bold text-green-900 sm:text-4xl">How it works</h2>
        <ol className="mt-10 divide-y divide-line border-y border-line">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-5 py-6">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green-900 font-mono text-lg font-semibold text-paper-50">
                {i + 1}
              </span>
              <div>
                <h3 className="text-xl font-bold text-green-900">{step.title}</h3>
                <p className="mt-1 max-w-prose text-charcoal-700">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
