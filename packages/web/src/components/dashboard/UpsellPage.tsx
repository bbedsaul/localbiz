import { Button, Badge } from '@/components/ui';
import type { ServiceModule } from '@/modules/types';

/** Shown when a customer reaches a service they're not entitled to (direct URL).
 *  Directive, in-system — never a 403. */
export function UpsellPage({ module }: { module: ServiceModule }) {
  const { Icon, name, upsell } = module;
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-green-100 text-green-900">
        <Icon className="h-7 w-7" />
      </div>
      {upsell.price && <Badge tone="brick">{upsell.price}</Badge>}
      <h1 className="mt-3 text-3xl font-bold text-green-900">{name}</h1>
      <p className="mt-2 text-charcoal-700">{upsell.pitch}</p>
      <div className="mt-6">
        <Button href={upsell.cta.href}>{upsell.cta.label}</Button>
      </div>
    </div>
  );
}
