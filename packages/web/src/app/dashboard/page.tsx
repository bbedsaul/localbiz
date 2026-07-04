import { requireBusiness } from '@/modules/context';
import { registry, MODULE_ORDER } from '@/modules/registry';
import { homeCardsFor } from '@/modules/select';
import { getOpenAlerts } from '@/lib/dashboard';
import { AlertsBanner } from '@/components/dashboard/AlertsBanner';
import { DiscoveryCard } from '@/components/dashboard/DiscoveryCard';

export default async function DashboardHome({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  const business = await requireBusiness();
  const cards = homeCardsFor(business, registry, MODULE_ORDER);
  const anyEntitled = cards.some((c) => c.entitled);
  const alerts = anyEntitled ? await getOpenAlerts(business.id) : [];

  // Resolve entitled OverviewCards (async server components) up front.
  const rendered = await Promise.all(
    cards.map(async (c) => ({
      key: c.module.key,
      node: c.entitled ? await c.module.OverviewCard({ business }) : <DiscoveryCard module={c.module} />,
    })),
  );

  return (
    <div className="space-y-6">
      {searchParams.welcome && (
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">
          🎉 You&rsquo;re all set! We&rsquo;re running your first full scan now — your complete report
          card lands within a day.
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-ink">Welcome back, {business.name}</h1>
        <p className="text-ink-faint">Everything LocalMarket runs for you, in one place.</p>
      </div>
      {alerts.length > 0 && <AlertsBanner alerts={alerts} />}
      <div className="grid gap-5 sm:grid-cols-2">
        {rendered.map((r) => (
          <div key={r.key}>{r.node}</div>
        ))}
      </div>
    </div>
  );
}
