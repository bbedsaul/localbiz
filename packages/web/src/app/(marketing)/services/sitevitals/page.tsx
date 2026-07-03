import type { Metadata } from 'next';
import { Placeholder } from '@/components/marketing/Placeholder';

export const metadata: Metadata = { title: 'SiteVitals' };

export default function SiteVitalsPage() {
  return (
    <Placeholder
      title="Know the moment your site breaks"
      blurb="Features, a real sample report, pricing, and FAQ arrive in the next build. Meanwhile, run a free scan from the home page."
    />
  );
}
