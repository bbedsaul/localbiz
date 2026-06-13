import Link from 'next/link';

const TIERS = [
  {
    id: 'solo',
    name: 'Solo',
    price: 29,
    tagline: 'For one business owner who wants peace of mind.',
    features: [
      'One website monitored 24/7',
      'Monthly plain-English report card',
      'Instant email alerts (downtime, expiring certificate)',
      'Google ranking & listing checks',
    ],
    cta: 'Start 14-day trial',
    featured: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    tagline: 'For owners who want to catch problems the moment they happen.',
    features: [
      'Everything in Solo',
      'Text-message (SMS) alerts',
      'Weekly mini check-ins',
      'Competitor comparison in your report',
    ],
    cta: 'Start 14-day trial',
    featured: true,
  },
];

export function Pricing() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {TIERS.map((tier) => (
        <div
          key={tier.id}
          className={`card relative flex flex-col p-6 sm:p-7 ${
            tier.featured ? 'ring-2 ring-brand-500' : ''
          }`}
        >
          {tier.featured && (
            <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Most popular
            </span>
          )}
          <h3 className="text-lg font-bold text-ink">{tier.name}</h3>
          <p className="mt-1 text-sm text-ink-soft">{tier.tagline}</p>
          <p className="mt-4">
            <span className="text-4xl font-bold text-ink">${tier.price}</span>
            <span className="text-ink-faint"> / month</span>
          </p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {tier.features.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm text-ink-soft">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mt-0.5 shrink-0 text-brand-500"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href={`/onboarding?plan=${tier.id}`}
            className={`mt-6 w-full ${tier.featured ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tier.cta}
          </Link>
        </div>
      ))}
    </div>
  );
}
