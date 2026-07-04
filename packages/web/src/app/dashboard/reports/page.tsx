import { redirect } from 'next/navigation';

// Flat path retired in W3 — reports now live under the SiteVitals module.
export default function LegacyReports() {
  redirect('/dashboard/sitevitals/reports');
}
