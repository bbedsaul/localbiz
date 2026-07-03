import type { Metadata } from 'next';
import { Placeholder } from '@/components/marketing/Placeholder';

export const metadata: Metadata = { title: 'Websites' };

export default function WebsitesPage() {
  return (
    <Placeholder
      title="Get a website that brings in work"
      blurb="Built for you — design, copy, domain, hosting, and 3 months of monitoring free. The full page and the “Request my website” form land in the next build."
    />
  );
}
