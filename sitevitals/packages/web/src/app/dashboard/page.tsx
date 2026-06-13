import Link from 'next/link';
import { GradeBadge } from '@/components/GradeBadge';
import { AlertsBanner } from '@/components/dashboard/AlertsBanner';
import { CategoryBars } from '@/components/dashboard/CategoryBars';
import { TrendChart } from '@/components/dashboard/TrendChart';
import {
  getLatestScan,
  getOpenAlerts,
  getPrimaryBusiness,
  getScores,
} from '@/lib/dashboard';
import { gradeWord } from '@/lib/format';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  const business = (await getPrimaryBusiness())!;
  const [scores, scan, alerts] = await Promise.all([
    getScores(business.id),
    getLatestScan(business.id),
    getOpenAlerts(business.id),
  ]);

  const latest = scan?.scores ?? null;

  return (
    <div className="space-y-6">
      {searchParams.welcome && (
        <div className="card bg-brand-50 p-4 text-sm text-brand-700">
          🎉 You&rsquo;re all set! We&rsquo;re running your first full scan now — your complete
          report card lands within a day, and every month after.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{business.name}</h1>
          <p className="text-ink-faint">Your website&rsquo;s health at a glance</p>
        </div>
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
                <p className="text-ink-soft">
                  {gradeWord(latest.grade)} · {latest.composite}/100
                </p>
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
              <Link href="/dashboard/checks" className="text-sm font-medium text-brand-600 hover:underline">
                See details →
              </Link>
            </div>
            <CategoryBars categories={latest.categories} />
          </div>
        </>
      ) : (
        <div className="card p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-500" />
          <p className="mt-4 font-medium text-ink">Your first full scan is on its way</p>
          <p className="mt-1 text-ink-soft">
            We&rsquo;re checking Google ranking, listings, page speed, and more. Your complete
            report card will appear here shortly.
          </p>
        </div>
      )}
    </div>
  );
}
