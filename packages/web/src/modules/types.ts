import type { ComponentType, ReactNode } from 'react';
import type { ServiceKey } from '@platform/core/billing';
import type { BusinessRow } from '@/lib/dashboard';

/**
 * A dashboard "page" for a module. May be an async server component — routes
 * invoke it (`module.pages.Overview({ business })`) and return/await the result,
 * which sidesteps async-component-in-JSX typing friction.
 */
export type ServiceView = (props: { business: BusinessRow }) => ReactNode | Promise<ReactNode>;

export interface ModuleRoutes {
  overview: string;
  reports: string;
  settings: string;
}

/**
 * The plug-in contract. The dashboard shell renders ENTIRELY from registered
 * modules (via the pure selectors in ./select) — adding a service requires zero
 * shell changes. Lives in web (not core) because it references React components.
 */
export interface ServiceModule {
  key: ServiceKey;
  name: string;
  tagline: string;
  Icon: ComponentType<{ className?: string }>;
  /** Entitled → module visible/usable; else → discovery/upsell card. */
  entitled(business: BusinessRow): boolean;
  routes: ModuleRoutes;
  /** Summary tile on the dashboard home (shown when entitled). */
  OverviewCard: ServiceView;
  /** Shown when NOT entitled (home discovery card + direct-URL upsell page). */
  upsell: { price?: string; pitch: string; cta: { label: string; href: string } };
  /** Full pages rendered by /dashboard/[service]/… routes. */
  pages: {
    Overview: ServiceView;
    Reports: ServiceView;
    Settings: ServiceView;
    Checks?: ServiceView;
  };
}
