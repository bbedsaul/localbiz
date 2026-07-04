import type { Metadata } from 'next';
import { ComingSoonService } from '@/components/marketing/ComingSoonService';

export const metadata: Metadata = { title: 'Social — stay posted, hands-free' };

export default function SocialPage() {
  return (
    <ComingSoonService
      serviceKey="social"
      name="Social"
      price="$49/mo"
      pitch="Keep your social pages active without lifting a finger — we draft and schedule posts for you."
      features={[
        { title: 'Done for you', body: 'We write and schedule posts that sound like your business.' },
        { title: 'Stay top of mind', body: 'A steady presence keeps you in front of local customers.' },
        { title: 'You stay in control', body: 'Approve anything you want — or let it run on autopilot.' },
      ]}
    />
  );
}
