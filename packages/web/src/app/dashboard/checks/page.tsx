import { redirect } from 'next/navigation';

// Flat path retired in W3 — checks now live under the SiteVitals module.
export default function LegacyChecks() {
  redirect('/dashboard/sitevitals/checks');
}
