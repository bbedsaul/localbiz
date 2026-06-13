'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface OnboardingPayload {
  url: string;
  name: string;
  category: string;
  city: string;
  keywords: string[];
  plan?: 'solo' | 'pro';
  phone?: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  businessId?: string;
}

/**
 * Create the business + tracked keywords for the signed-in owner. RLS enforces
 * owner_user_id = auth.uid(); the worker picks the business up on its next tick.
 */
export async function createBusiness(payload: OnboardingPayload): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase
    .from('businesses')
    .upsert(
      {
        owner_user_id: user.id,
        owner_email: user.email,
        name: payload.name,
        url: payload.url,
        category: payload.category,
        city: payload.city,
        phone: payload.phone ?? null,
        plan: payload.plan ?? 'solo',
        active: true,
      },
      { onConflict: 'url' },
    )
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  const businessId = data.id as string;

  const keywords = payload.keywords.filter(Boolean).slice(0, 5);
  if (keywords.length > 0) {
    await supabase.from('keywords').upsert(
      keywords.map((phrase) => ({ business_id: businessId, phrase, is_auto: true })),
      { onConflict: 'business_id,phrase' },
    );
  }

  revalidatePath('/dashboard');
  return { ok: true, businessId };
}

export async function updateContacts(
  businessId: string,
  fields: { owner_email?: string; phone?: string | null },
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from('businesses').update(fields).eq('id', businessId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/settings');
  return { ok: true };
}

export async function replaceKeywords(
  businessId: string,
  phrases: string[],
): Promise<ActionResult> {
  const supabase = createClient();
  const clean = [...new Set(phrases.map((p) => p.trim().toLowerCase()).filter(Boolean))].slice(0, 5);
  await supabase.from('keywords').delete().eq('business_id', businessId);
  if (clean.length > 0) {
    const { error } = await supabase
      .from('keywords')
      .insert(clean.map((phrase) => ({ business_id: businessId, phrase, is_auto: false })));
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/dashboard/settings');
  return { ok: true };
}
