import type { Metadata } from 'next';
import { Placeholder } from '@/components/marketing/Placeholder';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <Placeholder
      title="Privacy policy"
      blurb="Our plain-English privacy policy is being finalized and lands in the next build."
    />
  );
}
