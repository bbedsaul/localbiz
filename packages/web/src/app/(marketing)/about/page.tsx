import type { Metadata } from 'next';
import { Placeholder } from '@/components/marketing/Placeholder';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <Placeholder
      title="About LocalMarket"
      blurb="We handle the internet so local business owners can handle the business. The full story lands in the next build."
    />
  );
}
