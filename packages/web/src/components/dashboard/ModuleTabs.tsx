import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { ServiceModule } from '@/modules/types';

/** Sub-nav within a module's pages. `active` is set explicitly per route. */
export function ModuleTabs({ module, active }: { module: ServiceModule; active: string }) {
  const tabs = [
    { key: 'overview', label: 'Overview', href: module.routes.overview },
    ...(module.pages.Checks
      ? [{ key: 'checks', label: 'Checks', href: `${module.routes.overview}/checks` }]
      : []),
    { key: 'reports', label: 'Reports', href: module.routes.reports },
    { key: 'settings', label: 'Settings', href: module.routes.settings },
  ];
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            'whitespace-nowrap px-3 py-2 text-sm transition',
            active === t.key
              ? 'border-b-2 border-green-900 font-semibold text-green-900'
              : 'font-medium text-ink-soft hover:text-green-900',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
