import { Container, Section, Badge } from '@/components/ui';

/**
 * Single testimonial slot. Content is a CLEARLY-MARKED placeholder until we have
 * a real founding-customer quote (validation W3–W4).
 */
export function Testimonial() {
  return (
    <Section tone="panel">
      <Container>
        <figure className="mx-auto max-w-3xl rounded-2xl border border-line bg-surface p-8 shadow-card sm:p-10">
          <Badge tone="peach">Placeholder — real quote coming</Badge>
          <blockquote className="mt-4 font-display text-2xl leading-snug text-green-900 sm:text-3xl">
            “I fix furnaces. I don’t have time to babysit a website. LocalMarket just handles it —
            the first I hear about a problem is a text saying they already caught it.”
          </blockquote>
          <figcaption className="mt-5 text-sm text-charcoal-700">
            Founding customer — name &amp; business to be added
          </figcaption>
        </figure>
      </Container>
    </Section>
  );
}
