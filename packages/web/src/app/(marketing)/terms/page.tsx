import type { Metadata } from 'next';
import { Section, Container } from '@/components/ui';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <Section tone="paper">
      <Container>
        <div className="max-w-prose space-y-5 text-charcoal-700">
          <h1 className="text-4xl font-bold text-green-900">Terms of service</h1>
          <p className="text-sm text-ink-faint">Plain English. Last updated 2026.</p>

          <h2 className="pt-2 text-xl font-bold text-green-900">The service</h2>
          <p>
            LocalMarket provides website building, hosting, and monitoring services for local
            businesses. Features vary by the plan and services you subscribe to.
          </p>

          <h2 className="pt-2 text-xl font-bold text-green-900">Billing</h2>
          <p>
            Subscriptions are billed monthly or annually in advance and start with a free trial where
            noted. You can cancel anytime from your dashboard; cancellation stops future charges and
            takes effect at the end of the current period. Website builds are quoted and invoiced
            separately.
          </p>

          <h2 className="pt-2 text-xl font-bold text-green-900">Acceptable use</h2>
          <p>
            Use the service for your own lawful business. Don&rsquo;t abuse the free scanner, resell
            the service, or use it to harm others.
          </p>

          <h2 className="pt-2 text-xl font-bold text-green-900">No guarantees</h2>
          <p>
            We work hard to keep everything running, but the service is provided &ldquo;as is.&rdquo;
            Monitoring reduces surprises; it can&rsquo;t promise your site will never have issues.
          </p>

          <h2 className="pt-2 text-xl font-bold text-green-900">Contact</h2>
          <p>
            Questions? Email <a className="font-medium text-brick-600 underline" href="mailto:hello@localmarketz.com">hello@localmarketz.com</a>.
          </p>
        </div>
      </Container>
    </Section>
  );
}
