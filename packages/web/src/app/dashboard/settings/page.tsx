import { redirect } from 'next/navigation';

// Flat path retired in W3 — settings now live under the SiteVitals module.
export default function LegacySettings() {
  redirect('/dashboard/sitevitals/settings');
}
