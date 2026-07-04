import Link from 'next/link';
import type { BusinessRow } from '@/lib/dashboard';
import { Badge } from '@/components/ui';
import type { ServiceModule } from './types';

const BASE = '/dashboard/website';

// Shape stored under businesses.services.website (written by the admin console,
// a later session). Read-only here.
interface WebsiteService {
  status?: 'requested' | 'building' | 'live' | 'paused';
  url?: string;
  screenshot_url?: string;
  domain?: string;
  hosting_plan?: string;
  live_at?: string;
}

function websiteData(business: BusinessRow): WebsiteService {
  return (business.services?.website ?? {}) as WebsiteService;
}

function WindowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

async function OverviewCard({ business }: { business: BusinessRow }) {
  const w = websiteData(business);
  return (
    <Link href={BASE} className="card block p-6 transition hover:shadow-lift">
      <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
        <WindowIcon className="h-5 w-5" /> Website
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Badge tone={w.status === 'live' ? 'green' : 'neutral'}>{w.status ?? 'building'}</Badge>
        {w.url && <span className="truncate text-sm text-ink-soft">{w.url}</span>}
      </div>
    </Link>
  );
}

// Stage A: light overview from services.website. The full concierge experience
// (status timeline, screenshot, change requests) lands in Stage B.
async function Overview({ business }: { business: BusinessRow }) {
  const w = websiteData(business);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Your website</h1>
        <p className="text-ink-faint">Built and hosted by LocalMarket.</p>
      </div>
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <Badge tone={w.status === 'live' ? 'green' : 'neutral'}>{w.status ?? 'building'}</Badge>
          {w.url && (
            <a href={w.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-brick-600 underline">
              {w.url}
            </a>
          )}
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          Live build status, screenshot, domain &amp; SSL, and a “request changes” form are coming
          in the next update.
        </p>
      </div>
    </div>
  );
}

const Stub = ({ label }: { label: string }) => (
  <div className="card p-8 text-center">
    <p className="font-medium text-ink">{label}</p>
    <p className="mt-1 text-sm text-ink-soft">This lands in the next update.</p>
  </div>
);

export const websiteModule: ServiceModule = {
  key: 'website',
  name: 'Website',
  tagline: 'A professional site, built and hosted for you.',
  Icon: WindowIcon,
  entitled: (business) => {
    const s = websiteData(business).status;
    return s === 'building' || s === 'live';
  },
  routes: { overview: BASE, reports: `${BASE}/reports`, settings: `${BASE}/settings` },
  OverviewCard,
  upsell: {
    pitch: 'A professional website — design, copy, domain, and hosting — built for you in days.',
    cta: { label: 'Get a professional website', href: '/services/websites' },
  },
  pages: {
    Overview,
    Reports: () => <Stub label="Change-request history" />,
    Settings: () => <Stub label="Website settings" />,
  },
};
