import type { Metadata } from 'next';
import { prioritizeIssues } from 'sitevitals-engine';
import { Section, Container, Card, Button, Badge } from '@/components/ui';
import { GradeBadge } from '@/components/GradeBadge';
import { CategoryBars } from '@/components/dashboard/CategoryBars';
import { Faq } from '@/components/marketing/Faq';
import { SAMPLE_SCAN } from '@/lib/sample-scan';
import { gradeWord } from '@/lib/format';

export const metadata: Metadata = {
  title: 'SiteVitals — website monitoring',
  description:
    'A plain-English report card every month, plus an alert the instant your site goes down. Website health monitoring for local businesses.',
};

const WATCHES = [
  ['Is your site up?', 'We check around the clock and text you the moment it goes down.'],
  ['How fast it loads', 'Slow pages lose customers — we track speed on phones and desktops.'],
  ['Security & certificate', "We warn you before your security certificate lapses, not after."],
  ['Google ranking', 'Where you show up for the searches that bring you work.'],
  ['Listings match', 'Your name, address, and phone — consistent across Google, Yelp, Facebook.'],
  ['Broken links & SEO', 'Dead ends and missing basics that quietly cost you customers.'],
];

const FAQ = [
  { q: 'Do I need to be technical?', a: 'Not at all. You get a plain-English report card and a text if something urgent breaks. We handle the rest.' },
  { q: 'How often do you check?', a: 'Uptime is checked around the clock; the full report card comes monthly. Pro gets faster checks and priority alerts.' },
  { q: 'What if my site goes down?', a: 'You get an alert within minutes — by email, and by text on the Pro plan — so you can act before customers notice.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Manage or cancel your plan yourself from your dashboard — no phone calls, no hassle.' },
];

export default function SiteVitalsPage() {
  const { issues } = prioritizeIssues(SAMPLE_SCAN);
  const sample = SAMPLE_SCAN.scores;

  return (
    <>
      <Section tone="paper">
        <Container>
          <div className="max-w-prose">
            <Badge tone="green">SiteVitals · from $29/mo</Badge>
            <h1 className="mt-4 text-4xl font-bold text-green-900 sm:text-5xl">
              Know the moment your website has a problem.
            </h1>
            <p className="mt-4 text-lg text-charcoal-700">
              We watch your site around the clock and send a plain-English report card every month —
              so you find out about problems before your customers do.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/signup?service=sitevitals">Start free trial</Button>
              <Button href="/#services" variant="outline">Scan my site free</Button>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="panel">
        <Container>
          <h2 className="text-3xl font-bold text-green-900">What we keep an eye on</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WATCHES.map(([title, body]) => (
              <Card key={title} className="p-6">
                <h3 className="font-bold text-green-900">{title}</h3>
                <p className="mt-1 text-sm text-charcoal-700">{body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Sample report — rendered from a real ScanResult through prioritizeIssues */}
      <Section tone="paper">
        <Container>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-green-900">A sample report card</h2>
            <Badge tone="peach">Sample</Badge>
          </div>
          <Card className="mt-8 p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="flex items-center gap-4">
                <GradeBadge grade={sample.grade} size="lg" />
                <div>
                  <p className="text-sm text-ink-faint">Overall health</p>
                  <p className="text-2xl font-bold text-ink">{sample.grade}</p>
                  <p className="text-charcoal-700">{gradeWord(sample.grade)} · {sample.composite}/100</p>
                </div>
              </div>
              <CategoryBars categories={sample.categories} />
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-semibold text-ink">Worth your attention</p>
              <ul className="mt-3 space-y-3">
                {issues.slice(0, 3).map((it, i) => (
                  <li key={i}>
                    <p className="font-medium text-ink">{it.title}</p>
                    <p className="text-sm text-charcoal-700">{it.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </Container>
      </Section>

      <Section tone="panel">
        <Container>
          <h2 className="text-3xl font-bold text-green-900">Simple pricing</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
            <Card className="p-6">
              <h3 className="text-xl font-bold text-green-900">Solo</h3>
              <p className="mt-2"><span className="font-display text-4xl font-bold text-green-900">$29</span><span className="text-charcoal-500">/mo</span></p>
              <p className="mt-2 text-sm text-charcoal-700">One website, full monitoring, monthly report card, email alerts.</p>
              <Button href="/signup?service=sitevitals&plan=solo" variant="outline" className="mt-5 w-full">Start free trial</Button>
            </Card>
            <Card className="relative border-green-900 p-6">
              <span className="absolute right-5 top-5"><Badge tone="green">Most popular</Badge></span>
              <h3 className="text-xl font-bold text-green-900">Pro</h3>
              <p className="mt-2"><span className="font-display text-4xl font-bold text-green-900">$49</span><span className="text-charcoal-500">/mo</span></p>
              <p className="mt-2 text-sm text-charcoal-700">Everything in Solo, plus faster checks and priority text alerts.</p>
              <Button href="/signup?service=sitevitals&plan=pro" className="mt-5 w-full">Start free trial</Button>
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
