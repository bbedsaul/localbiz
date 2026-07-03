import Link from 'next/link';
import { BoardMark } from '@/components/BoardMark';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Services',
    links: [
      { label: 'Websites', href: '/services/websites' },
      { label: 'SiteVitals', href: '/services/sitevitals' },
      { label: 'Pricing', href: '/#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Sign in', href: '/login' },
      { label: 'Start free trial', href: '/signup' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-green-900 text-paper-50">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <BoardMark size={40} />
              <span className="font-display text-xl font-bold text-paper-50">LocalMarket</span>
            </div>
            <p className="mt-3 font-display text-lg text-peach-300">Online, handled.</p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-paper-50/60">
                {col.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-paper-50/85 transition hover:text-paper-50"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-12 border-t border-paper-50/15 pt-6 text-sm text-paper-50/60">
          © {new Date().getFullYear()} LocalMarket. Built on Main Street, not in Silicon Valley.
        </p>
      </div>
    </footer>
  );
}
