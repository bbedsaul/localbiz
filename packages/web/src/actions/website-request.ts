'use server';

import { createEmailProvider } from 'sitevitals-engine';
import { createAdminClient } from '@/lib/supabase/admin';

export interface WebsiteRequestState {
  ok: boolean;
  error?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/**
 * Public "Request my website" submission (concierge — no Stripe). Stores the
 * lead (service-role) and emails the operator. Both best-effort; never throws.
 */
export async function createWebsiteRequest(
  _prev: WebsiteRequestState,
  formData: FormData,
): Promise<WebsiteRequestState> {
  const get = (k: string) => String(formData.get(k) ?? '').trim();
  const business_name = get('business_name');
  const contact = get('contact');
  if (!business_name || !contact) {
    return { ok: false, error: 'Please tell us your business name and how to reach you.' };
  }
  const lead = {
    business_name,
    contact,
    what_you_do: get('what_you_do') || null,
    city: get('city') || null,
    current_site: get('current_site') || null,
    body: get('body') || null,
  };

  const admin = createAdminClient();
  if (admin) {
    const { error } = await admin.from('website_requests').insert(lead);
    if (error) return { ok: false, error: 'Something went wrong — please try again.' };
  }

  const provider = createEmailProvider();
  const notifyTo = process.env.WEBSITE_REQUEST_NOTIFY_EMAIL ?? process.env.ADMIN_EMAIL;
  if (provider && notifyTo) {
    try {
      await provider.send({
        to: notifyTo,
        subject: `Website request — ${business_name}`,
        html:
          `<p>New website request:</p><ul>` +
          Object.entries(lead)
            .filter(([, v]) => v)
            .map(([k, v]) => `<li><strong>${k}</strong>: ${escapeHtml(String(v))}</li>`)
            .join('') +
          `</ul>`,
        text: `New website request from ${business_name} (${contact}).`,
        tags: { kind: 'website_request' },
      });
    } catch {
      /* non-critical */
    }
  }

  return { ok: true };
}
