import type { ComponentType } from 'react';
import type { ServiceKey } from '@platform/core/billing';
import type { ServiceModule } from './types';

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 4h3l2 5-2 1a11 11 0 005 5l1-2 5 2v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// Non-entitled placeholder pages (never rendered — the [service] route shows the
// upsell for non-entitled modules — but the contract requires them).
const Soon = () => (
  <div className="card p-8 text-center">
    <p className="font-medium text-ink">Coming soon</p>
  </div>
);

function comingSoon(opts: {
  key: ServiceKey;
  name: string;
  tagline: string;
  price: string;
  pitch: string;
  Icon: ComponentType<{ className?: string }>;
}): ServiceModule {
  const base = `/dashboard/${opts.key}`;
  return {
    key: opts.key,
    name: opts.name,
    tagline: opts.tagline,
    Icon: opts.Icon,
    entitled: () => false, // no product yet
    routes: { overview: base, reports: `${base}/reports`, settings: `${base}/settings` },
    OverviewCard: () => null,
    upsell: {
      price: opts.price,
      pitch: opts.pitch,
      cta: { label: 'Join the waitlist', href: '/#services' },
    },
    pages: { Overview: Soon, Reports: Soon, Settings: Soon },
  };
}

export const callbackModule = comingSoon({
  key: 'callback',
  name: 'CallBack',
  tagline: 'Never lose a caller again.',
  price: '$39/mo',
  pitch: 'Miss a call and we text the caller back automatically — so you never lose the job.',
  Icon: PhoneIcon,
});

export const reviewsModule = comingSoon({
  key: 'reviews',
  name: 'Reviews',
  tagline: 'Turn happy customers into 5-star reviews.',
  price: '$49/mo',
  pitch: 'Automatically ask happy customers for a review at the right moment.',
  Icon: StarIcon,
});

export const socialModule = comingSoon({
  key: 'social',
  name: 'Social',
  tagline: 'Stay posted without lifting a finger.',
  price: '$49/mo',
  pitch: 'Keep your social pages active — we draft and schedule posts for you.',
  Icon: ShareIcon,
});
