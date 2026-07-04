'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export interface NavLink {
  href: string;
  label: string;
}

/** Top-level dashboard nav — driven by the registry (entitled services) + Billing. */
export function Nav({ items }: { items: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:gap-0.5">
      {items.map((l) => {
        const active = l.href === '/dashboard' ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition',
              active ? 'bg-green-100 text-green-900' : 'text-ink-soft hover:bg-paper-100',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
