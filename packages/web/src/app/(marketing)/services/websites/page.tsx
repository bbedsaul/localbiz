import type { Metadata } from 'next';
import { Section, Container, Card, Badge } from '@/components/ui';
import { Faq } from '@/components/marketing/Faq';
import { RequestWebsiteForm } from '@/components/marketing/RequestWebsiteForm';

export const metadata: Metadata = {
  title: 'Websites — built for you',
  description:
    'A professional website for your local business — design, copy, domain, and hosting, built for you in days. Includes 3 months of SiteVitals monitoring free.',
};

const INCLUDED = [
  ['Designed for your trade', 'Clean, mobile-first, and built to turn visitors into calls.'],
  ['We write the words', "You tell us what you do; we handle the copy so it reads well and ranks."],
  ['Your domain & hosting', 'We set up the domain and host it — nothing for you to manage.'],
  ['Live in days', 'Most sites go live within a week of our first call.'],
  ['3 months of SiteVitals free', 'Every site includes monitoring so you know it stays healthy.'],
  ['Changes handled for you', 'Need an update later? Send a request and we take care of it.'],
];

const FAQ = [
  { q: 'How much does it cost?', a: 'A one-time setup fee plus a low monthly hosting rate. We’ll give you an exact quote after a quick chat — request one below.' },
  { q: 'How long does it take?', a: 'Most sites are live within a week once we have your details and photos.' },
  { q: 'Do I own it?', a: 'Yes — the site and domain are yours. We build, host, and maintain it for you.' },
  { q: 'What if I already have a site?', a: 'We can rebuild or replace it. Share your current address in the form and we’ll take a look.' },
];

export default function WebsitesPage() {
  return (
    <>
      <Section tone="paper">
        <Container>
          <div className="max-w-prose">
            <Badge tone="brick">Websites · built for you</Badge>
            <h1 className="mt-4 text-4xl font-bold text-green-900 sm:text-5xl">
              Get a website that brings in work.
            </h1>
            <p className="mt-4 text-lg text-charcoal-700">
              We design, write, and host a professional site for your business — live in days. No
              templates to wrestle with, no monthly software to learn. We handle it.
            </p>
            <p className="mt-3 text-sm font-medium text-brick-700">
              Not self-serve — tell us about your business and we&rsquo;ll build it for you.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="panel">
        <Container>
          <h2 className="text-3xl font-bold text-green-900">Recent work</h2>
          <p className="mt-2 text-charcoal-700">A few sites we&rsquo;ve built for local businesses.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {['Trades', 'Health & beauty', 'Food & drink'].map((label) => (
              <Card key={label} className="overflow-hidden">
                <div className="grid h-40 place-items-center bg-green-900/5 text-sm text-charcoal-500">
                  Portfolio sample — {label}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-green-900">{label}</p>
                  <p className="text-sm text-charcoal-500">Sample placeholder</p>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container>
          <h2 className="text-3xl font-bold text-green-900">What&rsquo;s included</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map(([title, body]) => (
              <Card key={title} className="p-6">
                <h3 className="font-bold text-green-900">{title}</h3>
                <p className="mt-1 text-sm text-charcoal-700">{body}</p>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-sm text-charcoal-500">
            Pricing: <span className="font-mono text-charcoal-700">$X setup + $Y/mo</span> hosting
            (placeholder — we&rsquo;ll quote you exactly). No long-term contract.
          </p>
        </Container>
      </Section>

      <Section tone="panel" id="request">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-3xl font-bold text-green-900">Request my website</h2>
              <p className="mt-3 text-charcoal-700">
                Tell us a bit about your business. We&rsquo;ll review it and reach out with a quote
                and next steps — usually within a day.
              </p>
            </div>
            <Card className="p-6 sm:p-8">
              <RequestWebsiteForm />
            </Card>
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container>
          <h2 className="text-3xl font-bold text-green-900">Questions</h2>
          <div className="mt-8 max-w-3xl"><Faq items={FAQ} /></div>
        </Container>
      </Section>
    </>
  );
}
