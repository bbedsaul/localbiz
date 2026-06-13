import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client — bypasses RLS. Server-only, for unauthenticated flows
 * like Stripe webhooks. Never import this into a client component.
 */
export function createAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
