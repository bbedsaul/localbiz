import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
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

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  // supabase-js builds a realtime client at construction; Node <22 has no
  // global WebSocket, so supply ws. We don't use realtime — this just
  // satisfies the constructor.
  realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
});
export type { SupabaseClient };
