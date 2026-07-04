import { redirect, notFound } from 'next/navigation';
import { getPrimaryBusiness, type BusinessRow } from '@/lib/dashboard';
import { registry } from './registry';
import type { ServiceModule } from './types';

/** The signed-in owner's business, or bounce to (resume) signup. */
export async function requireBusiness(): Promise<BusinessRow> {
  const business = await getPrimaryBusiness();
  if (!business) redirect('/signup?service=sitevitals');
  return business;
}

/** Resolve a registered module by its route segment, or 404. */
export function moduleFor(service: string): ServiceModule {
  const m = (registry as Record<string, ServiceModule>)[service];
  if (!m) notFound();
  return m;
}
