import Link from 'next/link';
import type { ServiceModule } from '@/modules/types';

/** Home-grid card for a service the customer doesn't have yet — never blank. */
export function DiscoveryCard({ module }: { module: ServiceModule }) {
  const { Icon, name, upsell } = module;
  return (
    <div className="flex flex-col rounded-2xl border border-dashed border-charcoal-500/30 bg-paper-100 p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-charcoal-700">
        <Icon className="h-5 w-5" /> {name}
      </div>
      <p className="mt-2 flex-1 text-sm text-ink-soft">{upsell.pitch}</p>
      <div className="mt-4 flex items-center justify-between">
        {upsell.price && <span className="text-sm font-semibold text-green-900">{upsell.price}</span>}
        <Link href={upsell.cta.href} className="text-sm font-semibold text-brick-600 hover:underline">
          {upsell.cta.label} →
        </Link>
      </div>
    </div>
  );
}
