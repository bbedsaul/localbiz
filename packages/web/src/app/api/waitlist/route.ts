import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_SERVICES = new Set(['callback', 'reviews', 'social']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Capture an email for a coming-soon service waitlist. */
export async function POST(request: NextRequest) {
  let body: { email?: string; service?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const service = (body.service ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || !VALID_SERVICES.has(service)) {
    return NextResponse.json({ error: 'invalid email or service' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    // No service-role key configured — accept gracefully so the UI still works.
    return NextResponse.json({ ok: true });
  }

  // Idempotent on (email, service); a duplicate is a success from the user's view.
  const { error } = await admin.from('waitlist').upsert(
    { email, service },
    { onConflict: 'email,service', ignoreDuplicates: true },
  );
  if (error) {
    return NextResponse.json({ error: 'could not save' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
