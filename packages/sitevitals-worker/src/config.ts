import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

// Load .env files in order of precedence (dotenv keeps the first value seen):
// worker-local cwd → the monorepo root (.env), where shared keys live.
// On Fly, env comes from Fly secrets (process.env), so missing files are a no-op.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
// packages/sitevitals-worker/{src,dist} → ../../../ = repo root
dotenv.config({ path: path.join(here, '..', '..', '..', '.env') });

export interface WorkerConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  redisUrl: string;
  port: number;
  logLevel: string;
  sentryDsn?: string;
  resendWebhookSecret?: string;
  alertFromEmail?: string;
  /** Override recipient for ALL outbound mail — set in staging to avoid emailing real owners. */
  emailOverrideTo?: string;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): WorkerConfig {
  const supabaseUrl = env.SUPABASE_URL;
  // Context-block name is SUPABASE_SERVICE_KEY; Supabase dashboards hand out
  // SUPABASE_SERVICE_ROLE_KEY. Accept both.
  const supabaseServiceKey = env.SUPABASE_SERVICE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  const redisUrl = env.REDIS_URL ?? env.UPSTASH_REDIS_URL;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  if (!redisUrl) missing.push('REDIS_URL (Upstash rediss:// URL)');
  if (missing.length > 0) {
    throw new Error(`worker: missing required env vars: ${missing.join(', ')}`);
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseServiceKey: supabaseServiceKey!,
    redisUrl: redisUrl!,
    port: Number(env.PORT ?? 8080),
    logLevel: env.LOG_LEVEL ?? 'info',
    sentryDsn: env.SENTRY_DSN,
    resendWebhookSecret: env.RESEND_WEBHOOK_SECRET,
    alertFromEmail: env.ALERT_FROM_EMAIL ?? env.REPORT_FROM_EMAIL,
    emailOverrideTo: env.EMAIL_OVERRIDE_TO,
  };
}
