import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Proves RLS isolation on `businesses`: a customer sees only their own business;
 * an admin (via the is_admin() policy) sees all.
 *
 * Requires a real Supabase project with migration 003 applied, and:
 *   RLS_INTEGRATION=1 NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=…
 *   SUPABASE_SERVICE_ROLE_KEY=… pnpm --filter web test
 * Skipped otherwise so CI stays green without live creds.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENABLED = process.env.RLS_INTEGRATION === '1' && !!url && !!anonKey && !!serviceKey;

const PASSWORD = 'Test-Password-123!';
const run = randomUUID().slice(0, 8);

interface Seeded {
  admin: SupabaseClient;
  userA: { id: string; email: string };
  userB: { id: string; email: string };
  adminUser: { id: string; email: string };
  bizA: string;
  bizB: string;
}

let s: Seeded;

async function makeUser(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error('createUser failed');
  return { id: data.user.id, email };
}

async function signedInClient(email: string): Promise<SupabaseClient> {
  const c = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return c;
}

(ENABLED ? describe : describe.skip)('RLS isolation on businesses', () => {
  beforeAll(async () => {
    const admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    const userA = await makeUser(admin, `rls-a-${run}@example.com`);
    const userB = await makeUser(admin, `rls-b-${run}@example.com`);
    const adminUser = await makeUser(admin, `rls-admin-${run}@example.com`);

    const insBiz = async (owner: string, name: string) => {
      const { data, error } = await admin
        .from('businesses')
        .insert({ owner_user_id: owner, name, url: `https://${name}-${run}.example.com` })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    };
    const bizA = await insBiz(userA.id, 'biz-a');
    const bizB = await insBiz(userB.id, 'biz-b');

    await admin.from('profiles').upsert([
      { user_id: userA.id, role: 'customer', business_id: bizA },
      { user_id: userB.id, role: 'customer', business_id: bizB },
      { user_id: adminUser.id, role: 'admin' },
    ]);

    s = { admin, userA, userB, adminUser, bizA, bizB };
  }, 30_000);

  afterAll(async () => {
    if (!s) return;
    await s.admin.from('businesses').delete().in('id', [s.bizA, s.bizB]);
    for (const u of [s.userA, s.userB, s.adminUser]) {
      await s.admin.auth.admin.deleteUser(u.id);
    }
  });

  it('customer A sees only business A, never business B', async () => {
    const clientA = await signedInClient(s.userA.email);
    const { data } = await clientA.from('businesses').select('id');
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(s.bizA);
    expect(ids).not.toContain(s.bizB);
  });

  it('admin sees every business (is_admin bypass)', async () => {
    const adminClient = await signedInClient(s.adminUser.email);
    const { data } = await adminClient.from('businesses').select('id');
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(s.bizA);
    expect(ids).toContain(s.bizB);
  });
});
