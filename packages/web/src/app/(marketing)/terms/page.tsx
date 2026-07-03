import type { Metadata } from 'next';
import { Placeholder } from '@/components/marketing/Placeholder';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <Placeholder
      title="Terms of service"
      blurb="Our terms of service are being finalized and land in the next build."
    />
  );
}
