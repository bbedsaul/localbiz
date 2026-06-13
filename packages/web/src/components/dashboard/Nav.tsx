'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/checks', label: 'Checks' },
  { href: '/dashboard/reports', label: 'Reports' },
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/dashboard/billing', label: 'Billing' },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:gap-0.5">
      {LINKS.map((l) => {
        const active = l.href === '/dashboard' ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              active ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-canvas'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
