import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Setup Instructions:
 *
 * 1. Authentication → Settings → disable email confirmations
 *    (so invited users can sign in immediately)
 *
 * 2. Authentication → Users → Invite user → add your email
 *    (this is an invite-only system, no public sign-up)
 *
 * 3. Set Site URL to your deployed dashboard URL
 *    (for password reset redirects)
 *
 * 4. Enable RLS on prospects and outreach_queue tables
 *    (already handled in migrations)
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
