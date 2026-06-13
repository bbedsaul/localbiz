import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

/**
 * Platform Supabase client (service role). Shared by every service; each
 * service hangs its own tables off the businesses entity. Extracted from
 * Prospector — see DECISIONS.md (core/db = client only; service-specific
 * CRUD stays in each service package).
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
export type { SupabaseClient };
