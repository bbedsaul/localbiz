import { describe, it, expect } from 'vitest';
import { navItemsFor, homeCardsFor, entitledModules } from './select';
import type { ServiceModule } from './types';
import type { BusinessRow } from '@/lib/dashboard';

const noop = (() => null) as unknown as ServiceModule['OverviewCard'];

function fakeModule(key: string, entitled: boolean): ServiceModule {
  return {
    key: key as ServiceModule['key'],
    name: key,
    tagline: '',
    Icon: (() => null) as unknown as ServiceModule['Icon'],
    entitled: () => entitled,
    routes: {
      overview: `/dashboard/${key}`,
      reports: `/dashboard/${key}/reports`,
      settings: `/dashboard/${key}/settings`,
    },
    OverviewCard: noop,
    upsell: { pitch: '', cta: { label: 'x', href: '#' } },
    pages: { Overview: noop, Reports: noop, Settings: noop },
  };
}

const business = { id: 'b1', name: 'B', url: '', plan: 'solo' } as BusinessRow;

describe('registry selectors are shell-agnostic', () => {
  const registry: Record<string, ServiceModule> = {
    sitevitals: fakeModule('sitevitals', true),
    website: fakeModule('website', false),
  };
  const order = ['sitevitals', 'website'];

  it('nav lists only entitled modules', () => {
    expect(navItemsFor(business, registry, order).map((n) => n.key)).toEqual(['sitevitals']);
    expect(entitledModules(business, registry, order).map((m) => m.key)).toEqual(['sitevitals']);
  });

  it('home cards include every module with an entitled flag', () => {
    const cards = homeCardsFor(business, registry, order);
    expect(cards.map((c) => [c.module.key, c.entitled])).toEqual([
      ['sitevitals', true],
      ['website', false],
    ]);
  });

  // The acceptance test: adding a module changes only the registry, not the shell.
  it('a NEW demo module registers + surfaces with zero shell changes', () => {
    const withDemo = { ...registry, demo: fakeModule('demo', true) };
    const demoOrder = [...order, 'demo'];
    expect(navItemsFor(business, withDemo, demoOrder).map((n) => n.key)).toContain('demo');
    expect(homeCardsFor(business, withDemo, demoOrder).some((c) => c.module.key === 'demo')).toBe(true);
  });
});
