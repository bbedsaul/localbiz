import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui';

const NAV = [
  { label: 'Services', href: '/#services' },
  { label: 'How it works', href: '/#how' },
  { label: 'Pricing', href: '/#pricing' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper-50/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-charcoal-700 transition hover:text-green-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-semibold text-charcoal-700 transition hover:text-green-900 sm:inline"
          >
            Sign in
          </Link>
          <Button href="/signup" size="sm">
            Start free trial
          </Button>
        </div>
      </div>
    </header>
  );
}
