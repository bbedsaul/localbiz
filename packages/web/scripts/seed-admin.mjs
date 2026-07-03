#!/usr/bin/env node
/**
 * Create (or ensure) YOUR admin account. Idempotent — safe to run repeatedly.
 * Creates the auth user (email pre-confirmed) if missing, then upserts a
 * profiles row with role='admin'. Uses the service-role key (bypasses RLS).
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com node scripts/seed-admin.mjs
 *   (or set ADMIN_EMAIL in .env / .env.local; SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ENV_FILES = [
  join(here, '..', '.env.local'),
  join(here, '..', '.env'),
  join(here, '..', '..', '..', '.env'), // repo root
];

function readEnv(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
    for (const path of ENV_FILES) {
      try {
        const line = readFileSync(path, 'utf8')
          .split('\n')
          .find((l) => l.startsWith(`${name}=`));
        if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
      } catch {
        /* not present */
      }
    }
  }
  return undefined;
}

const url = readEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
const adminEmail = readEnv('ADMIN_EMAIL') || process.argv[2];

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!adminEmail) {
  console.error('Missing ADMIN_EMAIL (env or first arg).');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

let userId;
const created = await supabase.auth.admin.createUser({ email: adminEmail, email_confirm: true });
if (created.error) {
  // Most likely already registered — find the existing user.
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  const existing = data.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
  if (!existing) throw created.error;
  userId = existing.id;
  console.log(`User already exists: ${adminEmail} (${userId})`);
} else {
  userId = created.data.user.id;
  console.log(`Created user: ${adminEmail} (${userId})`);
}

const { error: upsertError } = await supabase
  .from('profiles')
  .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });
if (upsertError) throw upsertError;

console.log(`✅ Admin profile ensured for ${adminEmail}. Sign in via magic link → lands on /admin.`);
