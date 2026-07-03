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

const ENTITLED = new Set(['trialing', 'active', 'past_due']);

/**
 * Create (or resume) the signed-in owner's business + a customer profile, then
 * mark services.sitevitals.status='incomplete' — the pre-payment placeholder the
 * Stripe webhook flips to 'trialing' at checkout. Idempotent on the auth user:
 * a returning abandoner reuses their row (no duplicate) and we never downgrade an
 * already-entitled business back to incomplete. (Entitled transitions are
 * webhook-only; this writes only the pre-entitlement marker.)
 */
export async function createBusiness(payload: OnboardingPayload): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  // Look at any existing business for this owner to preserve entitlement.
  const { data: existing } = await supabase
    .from('businesses')
    .select('id, services, active, subscription_status')
    .eq('owner_user_id', user.id)
    .maybeSingle();

  const existingRow = existing as {
    services?: Record<string, { status?: string }>;
    active?: boolean;
    subscription_status?: string;
  } | null;
  const svStatus = existingRow?.services?.sitevitals?.status;
  const alreadyEntitled =
    existingRow?.active === true ||
    ENTITLED.has(existingRow?.subscription_status ?? '') ||
    ENTITLED.has(svStatus ?? '');

  const services = alreadyEntitled
    ? (existingRow?.services ?? {})
    : { ...(existingRow?.services ?? {}), sitevitals: { status: 'incomplete', plan: payload.plan ?? 'solo' } };

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
        active: alreadyEntitled, // stays off until the trial starts (webhook)
        services,
      },
      { onConflict: 'url' },
    )
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  const businessId = data.id as string;

  // Ensure a profile without clobbering an existing role (e.g. admin), then
  // link it to this business.
  await supabase
    .from('profiles')
    .upsert({ user_id: user.id, role: 'customer', business_id: businessId }, {
      onConflict: 'user_id',
      ignoreDuplicates: true,
    });
  await supabase.from('profiles').update({ business_id: businessId }).eq('user_id', user.id);

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
