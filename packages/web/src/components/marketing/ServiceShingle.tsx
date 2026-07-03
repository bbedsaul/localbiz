import Link from 'next/link';
import { Badge } from '@/components/ui';

export interface LiveService {
  name: string;
  tagline: string;
  control: string; // what the OWNER controls / gets, in their language
  href: string;
  cta: string;
  accent: 'green' | 'brick';
}

const ACCENT: Record<LiveService['accent'], { bar: string; badge: 'green' | 'brick' }> = {
  green: { bar: 'bg-green-900', badge: 'green' },
  brick: { bar: 'bg-brick-600', badge: 'brick' },
};

/** A "live" service — a full-color enamel plate on the signmaker's wall. */
export function ServiceShingle({ service }: { service: LiveService }) {
  const accent = ACCENT[service.accent];
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-card transition hover:shadow-lift">
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1.5 ${accent.bar}`} />
      <Badge tone={accent.badge}>Available now</Badge>
      <h3 className="mt-3 text-2xl font-bold text-green-900">{service.name}</h3>
      <p className="mt-1 text-charcoal-700">{service.tagline}</p>
      <p className="mt-3 flex-1 text-sm text-charcoal-500">{service.control}</p>
      <Link
        href={service.href}
        className="mt-5 inline-flex items-center gap-1.5 font-semibold text-brick-600 transition group-hover:gap-2.5"
      >
        {service.cta}
        <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
