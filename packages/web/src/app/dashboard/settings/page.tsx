import { SettingsForm } from '@/components/dashboard/SettingsForm';
import { createClient } from '@/lib/supabase/server';
import { getPrimaryBusiness } from '@/lib/dashboard';

export default async function SettingsPage() {
  const business = (await getPrimaryBusiness())!;
  const supabase = createClient();
  const { data: keywordRows } = await supabase
    .from('keywords')
    .select('phrase')
    .eq('business_id', business.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="text-ink-faint">Keywords and where we send your reports and alerts.</p>
      </div>
      <SettingsForm
        businessId={business.id}
        plan={business.plan}
        initialKeywords={(keywordRows ?? []).map((k) => (k as { phrase: string }).phrase)}
        initialEmail={business.owner_email ?? ''}
        initialPhone={business.phone ?? ''}
      />
    </div>
  );
}
