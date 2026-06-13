import { GradeBadge } from '@/components/GradeBadge';

/** A static, representative report-card preview (not live data). */
export function SampleReport() {
  return (
    <div className="card mx-auto max-w-md overflow-hidden">
      <div className="border-b border-line bg-canvas px-6 py-5 text-center">
        <p className="text-xs uppercase tracking-widest text-ink-faint">
          SiteVitals · Bloom Floral Co.
        </p>
        <p className="mt-1 font-semibold text-ink">Your June report card is a B — up from C</p>
        <div className="mt-4 flex justify-center">
          <GradeBadge grade="B" size="lg" />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Health score <span className="font-semibold text-ink">84</span> · Up from 71
        </p>
      </div>
      <div className="space-y-4 px-6 py-5 text-sm">
        <div>
          <p className="font-semibold text-ink">What&rsquo;s going well</p>
          <p className="text-ink-soft">
            ✓ Your site loads in 0.9 seconds — customers aren&rsquo;t kept waiting.
          </p>
        </div>
        <div>
          <p className="font-semibold text-ink">Worth your attention</p>
          <p className="text-ink-soft">
            Your phone number doesn&rsquo;t match between Google and Yelp. Customers calling the
            wrong number is lost business.
          </p>
        </div>
        <div className="rounded-xl bg-brand-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            This month&rsquo;s one thing
          </p>
          <p className="text-ink-soft">Update your Yelp phone number to match Google.</p>
        </div>
      </div>
    </div>
  );
}
