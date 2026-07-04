import Link from 'next/link';
import { prioritizeIssues } from 'sitevitals-engine';
import { isEntitled } from '@platform/core/billing';
import type { BusinessRow } from '@/lib/dashboard';
import { getScores, getLatestScan, getOpenAlerts, getReports } from '@/lib/dashboard';
import { createClient } from '@/lib/supabase/server';
import { gradeWord, periodLabel } from '@/lib/format';
import { GradeBadge } from '@/components/GradeBadge';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { CategoryBars } from '@/components/dashboard/CategoryBars';
import { AlertsBanner } from '@/components/dashboard/AlertsBanner';
import { SettingsForm } from '@/components/dashboard/SettingsForm';
import { ResendReportButton } from '@/components/dashboard/ResendReportButton';
import type { ServiceModule } from './types';

const BASE = '/dashboard/sitevitals';

function agoLabel(iso?: string): string {
  if (!iso) return 'not yet';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function PulseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M3 12h3l2-5 4 10 2-5h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FirstScanPending = () => (
  <div className="card p-8 text-center">
    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-green-900" />
    <p className="mt-4 font-medium text-ink">Your first full scan is on its way</p>
    <p className="mt-1 text-ink-soft">
      We&rsquo;re checking Google ranking, listings, page speed, and more. Your complete report card
      appears here shortly — usually within a day.
    </p>
  </div>
);

// ---- Home-grid tile ---------------------------------------------------------
async function OverviewCard({ business }: { business: BusinessRow }) {
  const scan = await getLatestScan(business.id);
  const s = scan?.scores ?? null;
  return (
    <Link href={BASE} className="card block p-6 transition hover:shadow-lift">
      <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
        <PulseIcon className="h-5 w-5" /> SiteVitals
      </div>
      {s ? (
        <div className="mt-4 flex items-center gap-4">
          <GradeBadge grade={s.grade} size="md" />
          <div>
            <p className="text-2xl font-bold text-ink">{s.grade}</p>
            <p className="text-sm text-ink-soft">{gradeWord(s.grade)} · {s.composite}/100</p>
            <p className="text-xs text-ink-faint">Checked {agoLabel(scan?.finishedAt)}</p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">First scan in progress — your grade lands soon.</p>
      )}
    </Link>
  );
}

// ---- Overview page ----------------------------------------------------------
async function Overview({ business }: { business: BusinessRow }) {
  const [scores, scan, alerts] = await Promise.all([
    getScores(business.id),
    getLatestScan(business.id),
    getOpenAlerts(business.id),
  ]);
  const latest = scan?.scores ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">SiteVitals</h1>
        <p className="text-ink-faint">
          Your website&rsquo;s health at a glance{scan ? ` · checked ${agoLabel(scan.finishedAt)}` : ''}
        </p>
      </div>

      <AlertsBanner alerts={alerts} />

      {latest ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="card flex items-center gap-5 p-6">
              <GradeBadge grade={latest.grade} size="lg" />
              <div>
                <p className="text-sm text-ink-faint">Overall health</p>
                <p className="text-3xl font-bold text-ink">{latest.grade}</p>
                <p className="text-ink-soft">{gradeWord(latest.grade)} · {latest.composite}/100</p>
              </div>
            </div>
            <div className="card p-6">
              <p className="mb-3 text-sm font-semibold text-ink">Score over time</p>
              <TrendChart data={scores} />
            </div>
          </div>
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Category breakdown</p>
              <Link href={`${BASE}/checks`} className="text-sm font-medium text-brick-600 hover:underline">
                See details →
              </Link>
            </div>
            <CategoryBars categories={latest.categories} />
          </div>
        </>
      ) : (
        <FirstScanPending />
      )}
    </div>
  );
}

// ---- Checks page (plain English) -------------------------------------------
async function Checks({ business }: { business: BusinessRow }) {
  const scan = await getLatestScan(business.id);
  if (!scan) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">What we found</h1>
        <FirstScanPending />
      </div>
    );
  }
  const { wins, issues } = prioritizeIssues(scan);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">What we found</h1>
        <p className="text-ink-faint">In plain English, ordered by what matters most.</p>
      </div>
      {wins.length > 0 && (
        <div className="card p-6">
          <p className="mb-3 text-sm font-semibold text-ink">What&rsquo;s going well</p>
          <ul className="space-y-2.5">
            {wins.map((w) => (
              <li key={w.id} className="flex gap-2.5 text-sm text-ink-soft">
                <span className="mt-0.5 text-green-700">✓</span>
                {w.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card divide-y divide-line">
        <p className="px-6 pt-6 text-sm font-semibold text-ink">Worth your attention ({issues.length})</p>
        {issues.length === 0 ? (
          <p className="px-6 py-5 text-sm text-ink-soft">Nothing needs fixing right now. Nice.</p>
        ) : (
          issues.map((issue, i) => (
            <div key={`${issue.id}-${i}`} className="px-6 py-5">
              <p className="font-semibold text-ink">{issue.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{issue.detail}</p>
              <p className="mt-1 text-sm italic text-ink-faint">Why it matters: {issue.why}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---- Reports archive (list → detail) ---------------------------------------
async function Reports({ business }: { business: BusinessRow }) {
  const [reports, scores] = await Promise.all([getReports(business.id), getScores(business.id)]);
  const gradeByPeriod = new Map(scores.map((s) => [s.period, s.grade]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Your reports</h1>
        <p className="text-ink-faint">Every monthly report card we&rsquo;ve sent you.</p>
      </div>
      {reports.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-medium text-ink">No reports yet</p>
          <p className="mt-1 text-ink-soft">
            Your first report card arrives by email at the start of next month. Your live health is
            on the <Link href={BASE} className="font-medium text-brick-600 underline">overview</Link> now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r, i) => {
            const grade = gradeByPeriod.get(r.period);
            return (
              <details key={r.id} className="card overflow-hidden" open={i === 0}>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-6 py-4 font-medium text-ink">
                  <span className="flex items-center gap-3">
                    {grade && <GradeBadge grade={grade} size="sm" />}
                    {periodLabel(r.period)}
                  </span>
                  <span className="text-sm font-normal text-ink-faint">
                    {r.sent_at ? (r.opened_at ? 'Sent · opened' : 'Sent · delivered') : 'Not sent'}
                  </span>
                </summary>
                <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-3">
                  <ResendReportButton reportId={r.id} />
                </div>
                <iframe
                  title={`Report for ${r.period}`}
                  srcDoc={r.html}
                  className="h-[640px] w-full border-t border-line bg-canvas"
                />
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Settings ---------------------------------------------------------------
async function Settings({ business }: { business: BusinessRow }) {
  const supabase = createClient();
  const { data: keywordRows } = await supabase
    .from('keywords')
    .select('phrase')
    .eq('business_id', business.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">SiteVitals settings</h1>
        <p className="text-ink-faint">Keywords, and where we send your reports and alerts.</p>
      </div>
      <SettingsForm
        businessId={business.id}
        plan={business.plan}
        initialKeywords={(keywordRows ?? []).map((k) => (k as { phrase: string }).phrase)}
        initialEmail={business.owner_email ?? ''}
        initialPhone={business.phone ?? ''}
      />
    </div>
  );
}

export const sitevitalsModule: ServiceModule = {
  key: 'sitevitals',
  name: 'SiteVitals',
  tagline: 'Know the moment your website has a problem.',
  Icon: PulseIcon,
  entitled: (business) => isEntitled(business.services, 'sitevitals'),
  routes: { overview: BASE, reports: `${BASE}/reports`, settings: `${BASE}/settings` },
  OverviewCard,
  upsell: {
    price: '$29/mo',
    pitch: 'A plain-English report card every month, plus an alert the instant your site goes down.',
    cta: { label: 'Start free trial', href: '/signup?service=sitevitals' },
  },
  pages: { Overview, Reports, Settings, Checks },
};
