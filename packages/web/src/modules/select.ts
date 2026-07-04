import type { BusinessRow } from '@/lib/dashboard';
import type { ServiceModule } from './types';

export interface NavItem {
  key: string;
  label: string;
  href: string;
}

export interface HomeCard {
  module: ServiceModule;
  entitled: boolean;
}

type Registry = Record<string, ServiceModule>;

/** Modules in display order (skips keys missing from the registry). */
function ordered(registry: Registry, order: string[]): ServiceModule[] {
  return order.map((k) => registry[k]).filter((m): m is ServiceModule => Boolean(m));
}

/** Modules the business is entitled to — the ones with live pages + nav links. */
export function entitledModules(
  business: BusinessRow,
  registry: Registry,
  order: string[],
): ServiceModule[] {
  return ordered(registry, order).filter((m) => m.entitled(business));
}

/** Left-nav entries: one per entitled module, plus the shell adds Billing. */
export function navItemsFor(business: BusinessRow, registry: Registry, order: string[]): NavItem[] {
  return entitledModules(business, registry, order).map((m) => ({
    key: m.key,
    label: m.name,
    href: m.routes.overview,
  }));
}

/** Home-grid cards: EVERY module, flagged entitled (→OverviewCard) or not (→upsell). */
export function homeCardsFor(business: BusinessRow, registry: Registry, order: string[]): HomeCard[] {
  return ordered(registry, order).map((m) => ({ module: m, entitled: m.entitled(business) }));
}
