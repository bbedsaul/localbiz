'use server';

import { createEmailProvider } from 'sitevitals-engine';
import { createClient } from '@/lib/supabase/server';
import { periodLabel } from '@/lib/format';

export interface ResendResult {
  ok: boolean;
  error?: string;
}

/**
 * Re-send a stored monthly report to the owner's email. RLS scopes the report to
 * the signed-in owner's businesses. Degrades gracefully (never throws) when
 * RESEND_API_KEY isn't configured. Does not overwrite the original sent_at.
 */
export async function resendReport(reportId: string): Promise<ResendResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data: report } = await supabase
    .from('reports')
    .select('period, html, business_id')
    .eq('id', reportId)
    .maybeSingle();
  if (!report) return { ok: false, error: 'Report not found.' };

  const { data: business } = await supabase
    .from('businesses')
    .select('owner_email')
    .eq('id', (report as { business_id: string }).business_id)
    .maybeSingle();
  const to = (business as { owner_email?: string } | null)?.owner_email || user.email;
  if (!to) return { ok: false, error: 'No email on file.' };

  const provider = createEmailProvider();
  if (!provider) return { ok: false, error: 'Email isn’t configured yet.' };

  const period = (report as { period: string }).period;
  try {
    await provider.send({
      to,
      subject: `Your SiteVitals report — ${periodLabel(period)}`,
      html: (report as { html: string }).html,
      text: `Your SiteVitals report for ${periodLabel(period)}.`,
      tags: { business_id: (report as { business_id: string }).business_id, period, resend: 'true' },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not send.' };
  }
}
