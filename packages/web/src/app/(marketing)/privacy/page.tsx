import type { Metadata } from 'next';
import { Section, Container } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <Section tone="paper">
      <Container>
        <div className="max-w-prose space-y-5 text-charcoal-700">
          <h1 className="text-4xl font-bold text-green-900">Privacy policy</h1>
          <p className="text-sm text-ink-faint">Plain English. Last updated 2026.</p>

          <h2 className="pt-2 text-xl font-bold text-green-900">What we collect</h2>
          <p>
            Your account email, your business details (name, website, category, city), and the
            results of the health scans we run on your site. If you subscribe, our payment processor
            handles your card — we never see or store card numbers.
          </p>

          <h2 className="pt-2 text-xl font-bold text-green-900">Why we collect it</h2>
          <p>
            To run your monitoring, send your report cards and alerts, and provide the services you
            signed up for. That&rsquo;s it — we don&rsquo;t sell your data, ever.
          </p>

          <h2 className="pt-2 text-xl font-bold text-green-900">Who we share it with</h2>
          <p>
            Only the tools that make the product work: our database and auth provider (Supabase),
            payments (Stripe), and email delivery (Resend). Each processes data only to provide their
            service to us.
          </p>

          <h2 className="pt-2 text-xl font-bold text-green-900">Your choices</h2>
          <p>
            You can access or delete your account data anytime — email us and we&rsquo;ll take care of
            it. We use a login cookie to keep you signed in; that&rsquo;s the only tracking we require.
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
