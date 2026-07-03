import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const FREE_SCANS_PER_DAY = 3;

/**
 * Derive a stable, privacy-preserving key for the caller. Behind Coolify's
 * Traefik the real client IP is the first hop of x-forwarded-for. We store only
 * a salted hash — never the raw IP.
 */
export function clientIpHash(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'localmarket';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 40);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Consume one unit of the daily free-scan quota for this IP.
 * FAIL-OPEN: any storage error returns `allowed: true` — we never block a real
 * visitor's scan because the limiter had a hiccup.
 */
export async function consumeScanQuota(
  ipHash: string,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const admin = createAdminClient();
    if (!admin) return { allowed: true, remaining: FREE_SCANS_PER_DAY };

    const day = today();
    const { data } = await admin
      .from('scan_rate_limits')
      .select('count')
      .eq('ip_hash', ipHash)
      .eq('day', day)
      .maybeSingle();

    const current = data?.count ?? 0;
    if (current >= FREE_SCANS_PER_DAY) {
      return { allowed: false, remaining: 0 };
    }

    await admin
      .from('scan_rate_limits')
      .upsert(
        { ip_hash: ipHash, day, count: current + 1, updated_at: new Date().toISOString() },
        { onConflict: 'ip_hash,day' },
      );

    return { allowed: true, remaining: FREE_SCANS_PER_DAY - (current + 1) };
  } catch {
    return { allowed: true, remaining: FREE_SCANS_PER_DAY };
  }
}
