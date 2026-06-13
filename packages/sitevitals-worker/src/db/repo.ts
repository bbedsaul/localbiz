import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
import type { CheckResult, ScanResult, ScoreBreakdown } from 'sitevitals-engine';
import type {
  AlertRow,
  AlertType,
  BusinessRow,
  CheckResultRow,
  ScoreRow,
} from './types.js';

export function createServiceClient(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    // supabase-js builds a realtime client at construction; Node <22 has no
    // native WebSocket, so supply ws. The worker never uses realtime — this
    // just satisfies the constructor.
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  });
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`supabase ${what}: ${result.error.message}`);
  if (result.data === null) throw new Error(`supabase ${what}: no data returned`);
  return result.data;
}

/** All worker database access. Service-role client — bypasses RLS by design. */
export class Repo {
  /** (businessId:type) → checks.id, so steady-state job runs skip the upsert. */
  private checkIdCache = new Map<string, string>();

  constructor(private readonly db: SupabaseClient) {}

  // -- businesses -----------------------------------------------------------

  async activeBusinesses(): Promise<BusinessRow[]> {
    const result = await this.db.from('businesses').select('*').eq('active', true);
    return unwrap(result, 'activeBusinesses') as BusinessRow[];
  }

  async getBusiness(id: string): Promise<BusinessRow | null> {
    const result = await this.db.from('businesses').select('*').eq('id', id).maybeSingle();
    if (result.error) throw new Error(`supabase getBusiness: ${result.error.message}`);
    return result.data as BusinessRow | null;
  }

  async keywordsFor(businessId: string): Promise<string[]> {
    const result = await this.db.from('keywords').select('phrase').eq('business_id', businessId);
    return (unwrap(result, 'keywordsFor') as { phrase: string }[]).map((r) => r.phrase);
  }

  // -- checks / check_results -------------------------------------------------

  async ensureCheck(businessId: string, type: string, schedule: string): Promise<string> {
    const cacheKey = `${businessId}:${type}`;
    const cached = this.checkIdCache.get(cacheKey);
    if (cached) return cached;

    const result = await this.db
      .from('checks')
      .upsert({ business_id: businessId, type, schedule }, { onConflict: 'business_id,type' })
      .select('id')
      .single();
    const id = (unwrap(result, 'ensureCheck') as { id: string }).id;
    this.checkIdCache.set(cacheKey, id);
    return id;
  }

  async insertCheckResult(
    businessId: string,
    type: string,
    schedule: string,
    check: Pick<CheckResult, 'status' | 'raw' | 'ranAt'>,
    score: number | null = null,
  ): Promise<void> {
    const checkId = await this.ensureCheck(businessId, type, schedule);
    const result = await this.db.from('check_results').insert({
      check_id: checkId,
      ran_at: check.ranAt,
      status: check.status,
      raw: check.raw,
      score,
    });
    if (result.error) throw new Error(`supabase insertCheckResult: ${result.error.message}`);
  }

  async latestCheckResult(businessId: string, type: string): Promise<CheckResultRow | null> {
    const checkResult = await this.db
      .from('checks')
      .select('id')
      .eq('business_id', businessId)
      .eq('type', type)
      .maybeSingle();
    if (checkResult.error || !checkResult.data) return null;
    const result = await this.db
      .from('check_results')
      .select('*')
      .eq('check_id', (checkResult.data as { id: string }).id)
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error) throw new Error(`supabase latestCheckResult: ${result.error.message}`);
    return result.data as CheckResultRow | null;
  }

  async latestFullScan(businessId: string): Promise<ScanResult | null> {
    const row = await this.latestCheckResult(businessId, 'full_scan');
    return row?.status === 'ok' ? (row.raw as ScanResult) : null;
  }

  // -- scores -------------------------------------------------------------------

  async upsertScores(businessId: string, period: string, scores: ScoreBreakdown): Promise<void> {
    const result = await this.db.from('scores').upsert(
      {
        business_id: businessId,
        period,
        category_scores: scores.categories,
        composite: scores.composite,
        grade: scores.grade,
      },
      { onConflict: 'business_id,period' },
    );
    if (result.error) throw new Error(`supabase upsertScores: ${result.error.message}`);
  }

  async scoresBefore(businessId: string, period: string): Promise<ScoreRow | null> {
    const result = await this.db
      .from('scores')
      .select('*')
      .eq('business_id', businessId)
      .lt('period', period)
      .order('period', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error) throw new Error(`supabase scoresBefore: ${result.error.message}`);
    return result.data as ScoreRow | null;
  }

  // -- alerts ----------------------------------------------------------------------

  async findOpenAlert(businessId: string, type: AlertType): Promise<AlertRow | null> {
    const result = await this.db
      .from('alerts')
      .select('*')
      .eq('business_id', businessId)
      .eq('type', type)
      .is('resolved_at', null)
      .maybeSingle();
    if (result.error) throw new Error(`supabase findOpenAlert: ${result.error.message}`);
    return result.data as AlertRow | null;
  }

  async createAlert(businessId: string, type: AlertType, message: string): Promise<AlertRow> {
    const result = await this.db
      .from('alerts')
      .insert({ business_id: businessId, type, message })
      .select('*')
      .single();
    return unwrap(result, 'createAlert') as AlertRow;
  }

  async markAlertNotified(id: string, via: string[], at: Date): Promise<void> {
    const result = await this.db
      .from('alerts')
      .update({ notified_via: via, last_notified_at: at.toISOString() })
      .eq('id', id);
    if (result.error) throw new Error(`supabase markAlertNotified: ${result.error.message}`);
  }

  async resolveAlert(id: string, at: Date): Promise<void> {
    const result = await this.db
      .from('alerts')
      .update({ resolved_at: at.toISOString() })
      .eq('id', id);
    if (result.error) throw new Error(`supabase resolveAlert: ${result.error.message}`);
  }

  // -- reports -----------------------------------------------------------------------

  async upsertReport(
    businessId: string,
    period: string,
    html: string,
    sent: { resendEmailId: string; sentAt: Date } | null,
  ): Promise<void> {
    const result = await this.db.from('reports').upsert(
      {
        business_id: businessId,
        period,
        html,
        resend_email_id: sent?.resendEmailId ?? null,
        sent_at: sent?.sentAt.toISOString() ?? null,
      },
      { onConflict: 'business_id,period' },
    );
    if (result.error) throw new Error(`supabase upsertReport: ${result.error.message}`);
  }

  async markReportEvent(
    resendEmailId: string,
    field: 'opened_at' | 'clicked_at',
    at: Date,
  ): Promise<boolean> {
    const result = await this.db
      .from('reports')
      .update({ [field]: at.toISOString() })
      .eq('resend_email_id', resendEmailId)
      .is(field, null)
      .select('id');
    if (result.error) throw new Error(`supabase markReportEvent: ${result.error.message}`);
    return ((result.data as { id: string }[] | null) ?? []).length > 0;
  }
}
