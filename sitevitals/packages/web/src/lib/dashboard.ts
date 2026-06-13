import type { ScanResult } from '@sitevitals/engine';
import { createClient } from '@/lib/supabase/server';

export interface BusinessRow {
  id: string;
  name: string;
  url: string;
  category: string | null;
  city: string | null;
  plan: 'solo' | 'pro' | 'multi';
  owner_email: string | null;
  phone: string | null;
  stripe_customer_id?: string | null;
  subscription_status?: string | null;
}

export interface ScoreRow {
  period: string;
  composite: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface AlertRow {
  id: string;
  type: 'site_down' | 'ssl_expiring' | 'domain_expiring' | 'blacklisted';
  message: string;
  triggered_at: string;
}

export interface ReportRow {
  id: string;
  period: string;
  html: string;
  sent_at: string | null;
  opened_at: string | null;
}

/** The signed-in owner's primary business (RLS-scoped). */
export async function getPrimaryBusiness(): Promise<BusinessRow | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as BusinessRow | null;
}

export async function getScores(businessId: string): Promise<ScoreRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('scores')
    .select('period, composite, grade')
    .eq('business_id', businessId)
    .order('period', { ascending: true });
  return (data ?? []) as ScoreRow[];
}

export async function getLatestScan(businessId: string): Promise<ScanResult | null> {
  const supabase = createClient();
  // The full ScanResult is stored on the latest 'full_scan' check_result.
  const { data: check } = await supabase
    .from('checks')
    .select('id')
    .eq('business_id', businessId)
    .eq('type', 'full_scan')
    .maybeSingle();
  if (!check) return null;
  const { data: result } = await supabase
    .from('check_results')
    .select('raw, status')
    .eq('check_id', (check as { id: string }).id)
    .order('ran_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = result as { raw: ScanResult; status: string } | null;
  return row?.status === 'ok' ? row.raw : null;
}

export async function getOpenAlerts(businessId: string): Promise<AlertRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('alerts')
    .select('id, type, message, triggered_at')
    .eq('business_id', businessId)
    .is('resolved_at', null)
    .order('triggered_at', { ascending: false });
  return (data ?? []) as AlertRow[];
}

export async function getReports(businessId: string): Promise<ReportRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('reports')
    .select('id, period, html, sent_at, opened_at')
    .eq('business_id', businessId)
    .order('period', { ascending: false });
  return (data ?? []) as ReportRow[];
}
