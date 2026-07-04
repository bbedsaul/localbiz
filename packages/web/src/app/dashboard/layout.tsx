import { Logo } from '@/components/Logo';
import { Nav } from '@/components/dashboard/Nav';
import { signOut } from '@/actions/auth';
import { prettyHost } from '@/lib/format';
import { requireBusiness } from '@/modules/context';
import { registry, MODULE_ORDER } from '@/modules/registry';
import { navItemsFor } from '@/modules/select';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const business = await requireBusiness();

  // Nav is registry-driven: one link per entitled service, plus Billing.
  const items = [
    { href: '/dashboard', label: 'Home' },
    ...navItemsFor(business, registry, MODULE_ORDER),
    { href: '/dashboard/billing', label: 'Billing' },
  ];

  return (
    <div className="min-h-dvh bg-paper-50">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Logo href="/dashboard" />
            <span className="hidden text-sm text-ink-faint sm:inline">· {prettyHost(business.url)}</span>
          </div>
          <form action={signOut}>
            <button className="btn-ghost px-3 py-1.5 text-sm">Sign out</button>
          </form>
        </div>
      </header>
      <div className="container-page grid gap-8 py-8 sm:grid-cols-[180px_1fr]">
        <aside>
          <Nav items={items} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
