import type { Metadata } from 'next';
import { Section, Container } from '@/components/ui';

export const metadata: Metadata = {
  title: 'About',
  description: 'LocalMarket handles the internet so local business owners can handle the business.',
};

export default function AboutPage() {
  return (
    <Section tone="paper">
      <Container>
        <div className="max-w-prose">
          <h1 className="text-4xl font-bold text-green-900 sm:text-5xl">
            We handle the internet. You handle the business.
          </h1>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-charcoal-700">
            <p>
              Most small-business owners we meet are great at their trade and stretched thin
              everywhere else. Their website breaks and they find out from a customer. Their Google
              listing has the wrong hours. A missed call is a lost job.
            </p>
            <p>
              LocalMarket exists to take all of that off your plate. We build and host your website,
              watch it around the clock, keep your listings straight, and — soon — catch missed calls,
              gather reviews, and keep your social pages alive. One login, one bill, done.
            </p>
            <p>
              We&rsquo;re built on Main Street, not in Silicon Valley. No jargon, no dashboards you
              need a manual for — just plain-English updates and a text when something actually needs
              your attention.
            </p>
          </div>
          <p className="mt-8 font-display text-2xl text-brick-600">Online, handled.</p>
        </div>
      </Container>
    </Section>
  );
}
