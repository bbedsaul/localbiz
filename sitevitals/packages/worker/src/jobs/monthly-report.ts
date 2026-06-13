import {
  createEmailProvider,
  letterGrade,
  narrate,
  prioritizeIssues,
  renderReportEmail,
  type EmailProvider,
  type Trend,
} from '@sitevitals/engine';
import type { ScoreRow } from '../db/types.js';
import { previousPeriod } from '../queues/definitions.js';
import type { JobDeps } from './uptime.js';

function trendFromScoreRow(currentComposite: number, prev: ScoreRow | null): Trend | null {
  if (!prev) return null;
  const delta = Math.round((currentComposite - prev.composite) * 10) / 10;
  const direction = delta >= 1 ? 'up' : delta <= -1 ? 'down' : 'flat';
  return {
    previousGrade: prev.grade,
    previousComposite: prev.composite,
    currentComposite,
    delta,
    direction,
    arrow: direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→',
  };
}

export interface MonthlyReportDeps extends JobDeps {
  email?: EmailProvider | null;
  /** Staging safety valve — route report email here instead of the owner. */
  overrideTo?: string;
}

/**
 * 1st-of-month job: latest full scan + previous period scores → report
 * pipeline → store HTML in reports → send via Resend → record sent_at.
 */
export async function runMonthlyReportJob(
  businessId: string,
  period: string | undefined,
  deps: MonthlyReportDeps,
): Promise<void> {
  const { repo, log } = deps;
  const business = await repo.getBusiness(businessId);
  if (!business?.active) return;

  const scan = await repo.latestFullScan(business.id);
  if (!scan) {
    log.warn({ businessId }, 'monthly report skipped — no full scan stored yet');
    return;
  }

  const reportPeriod = period ?? previousPeriod(new Date());
  const prevScores = await repo.scoresBefore(business.id, reportPeriod);
  const trend = trendFromScoreRow(scan.scores.composite, prevScores);
  const monthName = new Date(`${reportPeriod}-15T00:00:00Z`).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });

  const { wins, issues } = prioritizeIssues(scan);
  const narration = await narrate({
    business: business.name,
    period: monthName,
    grade: letterGrade(scan.scores.composite),
    composite: scan.scores.composite,
    trend,
    wins,
    issues: issues.slice(0, 3),
  });

  const email = renderReportEmail({
    business: business.name,
    period: monthName,
    grade: scan.scores.grade,
    composite: scan.scores.composite,
    trend,
    narrative: narration.narrative,
    categories: scan.scores.categories,
    url: business.url,
  });

  const provider = deps.email ?? createEmailProvider();
  const to = deps.overrideTo ?? business.owner_email;
  let sent: { resendEmailId: string; sentAt: Date } | null = null;

  if (provider && to) {
    const { id } = await provider.send({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: { business_id: business.id, period: reportPeriod },
    });
    sent = { resendEmailId: id, sentAt: new Date() };
  } else {
    log.warn(
      { businessId, hasProvider: !!provider, hasRecipient: !!to },
      'report stored but not sent (missing email provider or recipient)',
    );
  }

  await repo.upsertReport(business.id, reportPeriod, email.html, sent);
  log.info(
    { businessId, period: reportPeriod, narration: narration.source, sent: !!sent },
    'monthly report complete',
  );
}
