import type { Metadata } from 'next';
import { ComingSoonService } from '@/components/marketing/ComingSoonService';

export const metadata: Metadata = { title: 'Reviews — get more 5-star reviews' };

export default function ReviewsPage() {
  return (
    <ComingSoonService
      serviceKey="reviews"
      name="Reviews"
      price="$49/mo"
      pitch="Turn happy customers into 5-star reviews, automatically — the single biggest lever on local search."
      features={[
        { title: 'Ask at the right time', body: 'We nudge happy customers for a review right after the job.' },
        { title: 'More stars, more calls', body: 'Higher ratings mean more people choose you on Google.' },
        { title: 'Catch problems early', body: 'Unhappy? It comes to you first, not to a public review.' },
      ]}
    />
  );
}
