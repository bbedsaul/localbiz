import { Container, Section, Button, Badge } from '@/components/ui';

/**
 * In-system stub for pages built in Stage B / later sessions — keeps the Stage A
 * preview fully navigable (no Next 404s) while staying on-brand.
 */
export function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <Section tone="paper" className="grid min-h-[60vh] place-items-center">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <Badge tone="neutral">In progress</Badge>
          <h1 className="mt-4 text-4xl font-bold text-green-900">{title}</h1>
          <p className="mt-3 text-lg text-charcoal-700">{blurb}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button href="/">Back home</Button>
            <Button href="/signup" variant="outline">
              Start free trial
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
