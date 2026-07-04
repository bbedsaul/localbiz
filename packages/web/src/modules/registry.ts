import type { ServiceKey } from '@platform/core/billing';
import type { ServiceModule } from './types';
import { sitevitalsModule } from './sitevitals';
import { websiteModule } from './website';
import { callbackModule, reviewsModule, socialModule } from './coming-soon';

/** Display order across nav + home grid. */
export const MODULE_ORDER: ServiceKey[] = ['sitevitals', 'website', 'callback', 'reviews', 'social'];

/**
 * The service registry — the ONE place a module is wired in. The dashboard shell
 * reads only this + the ./select selectors, so adding a service is zero shell
 * changes (see the registry test).
 */
export const registry: Record<ServiceKey, ServiceModule> = {
  sitevitals: sitevitalsModule,
  website: websiteModule,
  callback: callbackModule,
  reviews: reviewsModule,
  social: socialModule,
};
