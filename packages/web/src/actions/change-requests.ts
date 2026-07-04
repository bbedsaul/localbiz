'use server';

import { revalidatePath } from 'next/cache';
import { createEmailProvider } from 'sitevitals-engine';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPrimaryBusiness } from '@/lib/dashboard';

const BUCKET = 'change-request-attachments';

export interface ChangeRequestState {
  ok: boolean;
  error?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/**
 * File a website change request. Inserts via the RLS client (owner-scoped), then
 * — best-effort, non-blocking — uploads an optional attachment (service-role,
 * bucket may not exist yet) and emails a notification. Never throws.
 */
export async function createChangeRequest(
  _prev: ChangeRequestState,
  formData: FormData,
): Promise<ChangeRequestState> {
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { ok: false, error: 'Please describe the change you’d like.' };

  const business = await getPrimaryBusiness();
  if (!business) return { ok: false, error: 'No business on file.' };

  const supabase = createClient();
  const { data: inserted, error } = await supabase
    .from('change_requests')
    .insert({ business_id: business.id, body })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  const id = (inserted as { id: string }).id;

  // Optional attachment (best-effort; needs the storage bucket to exist).
  const file = formData.get('file');
  if (file instanceof File && file.size > 0) {
    const admin = createAdminClient();
    if (admin) {
      const key = `change-requests/${business.id}/${id}-${file.name}`.replace(/\s+/g, '_');
      const buf = Buffer.from(await file.arrayBuffer());
      const up = await admin.storage.from(BUCKET).upload(key, buf, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });
      if (!up.error) {
        await admin.from('change_requests').update({ attached_file_key: key }).eq('id', id);
      }
    }
  }

  // Notify the operator (best-effort).
  const provider = createEmailProvider();
  const notifyTo = process.env.CHANGE_REQUEST_NOTIFY_EMAIL ?? process.env.ADMIN_EMAIL;
  if (provider && notifyTo) {
    try {
      await provider.send({
        to: notifyTo,
        subject: `Website change request — ${business.name}`,
        html: `<p><strong>${escapeHtml(business.name)}</strong> requested a change:</p><p>${escapeHtml(body)}</p>`,
        text: `${business.name} requested a change:\n\n${body}`,
        tags: { business_id: business.id, kind: 'change_request' },
      });
    } catch {
      /* notification is non-critical */
    }
  }

  revalidatePath('/dashboard/website');
  revalidatePath('/dashboard/website/reports');
  return { ok: true };
}
