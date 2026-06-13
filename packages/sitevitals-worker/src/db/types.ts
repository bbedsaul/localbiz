/**
 * Hand-maintained row types matching migrations/001_init.sql.
 *
 * Once the Supabase project is linked, regenerate the canonical types with
 * `pnpm gen:types` (supabase gen types typescript) and migrate the repo layer
 * to the generated Database generic. Until then these stay in lockstep with
 * the migration by hand.
 */
import type { LetterGrade } from 'sitevitals-engine';

export type Plan = 'solo' | 'pro' | 'multi';

export interface BusinessRow {
  id: string;
  name: string;
  url: string;
  category: string | null;
  city: string | null;
  gbp_id: string | null;
  yelp_id: string | null;
  fb_id: string | null;
  plan: Plan;
  owner_user_id: string | null;
  owner_email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
}

export interface KeywordRow {
  id: string;
  business_id: string;
  phrase: string;
  is_auto: boolean;
}

export interface CheckRow {
  id: string;
  business_id: string;
  type: string;
  schedule: string;
  config: Record<string, unknown>;
}

export interface CheckResultRow {
  id: string;
  check_id: string;
  ran_at: string;
  status: 'ok' | 'error' | 'skipped';
  raw: unknown;
  score: number | null;
}

export interface ScoreRow {
  id: string;
  business_id: string;
  period: string;
  category_scores: unknown;
  composite: number;
  grade: LetterGrade;
}

export interface ReportRow {
  id: string;
  business_id: string;
  period: string;
  html: string;
  resend_email_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
}

export type AlertType = 'site_down' | 'ssl_expiring' | 'domain_expiring' | 'blacklisted';

export interface AlertRow {
  id: string;
  business_id: string;
  type: AlertType;
  message: string;
  triggered_at: string;
  resolved_at: string | null;
  notified_via: string[];
  last_notified_at: string | null;
}
