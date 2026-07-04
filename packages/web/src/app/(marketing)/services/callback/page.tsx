import type { Metadata } from 'next';
import { ComingSoonService } from '@/components/marketing/ComingSoonService';

export const metadata: Metadata = { title: 'CallBack — missed-call recovery' };

export default function CallbackPage() {
  return (
    <ComingSoonService
      serviceKey="callback"
      name="CallBack"
      price="$39/mo"
      pitch="Miss a call and we text the caller back automatically — so you never lose the job to whoever picks up next."
      features={[
        { title: 'Instant text-back', body: 'A missed call triggers a friendly text within seconds.' },
        { title: 'Never lose a lead', body: 'Most callers who reach voicemail just call the next business. Not anymore.' },
        { title: 'Zero effort', body: 'Runs quietly in the background — you keep working.' },
      ]}
    />
  );
}
