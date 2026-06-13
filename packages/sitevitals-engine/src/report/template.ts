import type { CategoryScore, LetterGrade } from '../types.js';
import type { ReportNarrative } from './narrate.js';
import type { Trend } from './trend.js';

export interface ReportEmailData {
  business: string;
  period: string;
  grade: LetterGrade;
  composite: number;
  trend: Trend | null;
  narrative: ReportNarrative;
  categories: CategoryScore[];
  url: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const GRADE_COLORS: Record<LetterGrade, string> = {
  A: '#2e7d32',
  B: '#558b2f',
  C: '#f9a825',
  D: '#ef6c00',
  F: '#c62828',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trendLine(trend: Trend | null): string {
  if (!trend) return '';
  if (trend.direction === 'flat') {
    return `Holding steady (${trend.previousComposite} → ${trend.currentComposite})`;
  }
  const verb = trend.direction === 'up' ? 'Up' : 'Down';
  return `${verb} from ${trend.previousGrade} (${trend.previousComposite} → ${trend.currentComposite})`;
}

export function renderReportEmail(data: ReportEmailData): RenderedEmail {
  const { business, period, grade, composite, trend, narrative, categories, url } = data;
  const color = GRADE_COLORS[grade];
  const subject = `Your ${period} Website Report Card: ${grade}${trend ? ` ${trend.arrow}` : ''}`;
  const trendText = trendLine(trend);

  const measured = categories.filter((c) => c.score !== null);

  const winsHtml = narrative.wins
    .map(
      (w) => `
        <tr>
          <td style="padding:0 0 12px 0;font-size:15px;line-height:22px;color:#2d3436;">
            <span style="color:#2e7d32;font-weight:bold;">&#10003;&nbsp;</span>${escapeHtml(w)}
          </td>
        </tr>`,
    )
    .join('');

  const issuesHtml =
    narrative.issues.length === 0
      ? `<tr><td style="padding:0 0 12px 0;font-size:15px;line-height:22px;color:#2d3436;">Nothing needs your attention this month. Nice.</td></tr>`
      : narrative.issues
          .map(
            (issue, i) => `
        <tr>
          <td style="padding:0 0 18px 0;">
            <p style="margin:0 0 4px 0;font-size:15px;line-height:22px;color:#2d3436;font-weight:bold;">${i + 1}. ${escapeHtml(issue.title)}</p>
            <p style="margin:0 0 4px 0;font-size:15px;line-height:22px;color:#2d3436;">${escapeHtml(issue.plainExplanation)}</p>
            <p style="margin:0;font-size:14px;line-height:20px;color:#636e72;font-style:italic;">Why it matters: ${escapeHtml(issue.whyItMatters)}</p>
          </td>
        </tr>`,
          )
          .join('');

  const scoresHtml = measured
    .map(
      (c) => `
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#636e72;">${escapeHtml(c.label)}</td>
          <td style="padding:4px 0;font-size:13px;color:#2d3436;text-align:right;font-weight:bold;">${c.score}</td>
        </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f6fa;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(narrative.headline)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f6fa;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">

        <tr><td style="padding:32px 32px 8px 32px;text-align:center;">
          <p style="margin:0 0 4px 0;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#636e72;">SiteVitals &middot; ${escapeHtml(business)}</p>
          <p style="margin:0 0 20px 0;font-size:20px;line-height:28px;color:#2d3436;font-weight:bold;">${escapeHtml(narrative.headline)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
            <td style="width:96px;height:96px;border-radius:48px;background-color:${color};text-align:center;vertical-align:middle;font-size:48px;font-weight:bold;color:#ffffff;">${grade}</td>
          </tr></table>
          <p style="margin:12px 0 0 0;font-size:14px;color:#636e72;">Health score: <strong style="color:#2d3436;">${composite} / 100</strong>${trendText ? ` &nbsp;&middot;&nbsp; ${escapeHtml(trendText)}` : ''}</p>
        </tr></td>

        <tr><td style="padding:8px 32px 0 32px;">
          <p style="margin:16px 0;font-size:15px;line-height:23px;color:#2d3436;">${escapeHtml(narrative.summaryParagraph)}</p>
        </td></tr>

        <tr><td style="padding:8px 32px 0 32px;">
          <p style="margin:0 0 10px 0;font-size:16px;color:#2d3436;font-weight:bold;">What's going well</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${winsHtml}</table>
        </td></tr>

        <tr><td style="padding:16px 32px 0 32px;">
          <p style="margin:0 0 10px 0;font-size:16px;color:#2d3436;font-weight:bold;">Worth your attention</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${issuesHtml}</table>
        </td></tr>

        <tr><td style="padding:8px 32px 0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f8e9;border-radius:6px;">
            <tr><td style="padding:16px;">
              <p style="margin:0 0 4px 0;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#558b2f;font-weight:bold;">This month's one thing</p>
              <p style="margin:0;font-size:15px;line-height:22px;color:#2d3436;">${escapeHtml(narrative.recommendedAction)}</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 32px 0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e8e8;">
            <tr><td style="padding:16px 0 0 0;">
              <p style="margin:0 0 6px 0;font-size:13px;color:#636e72;font-weight:bold;">Category scores</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${scoresHtml}</table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 32px 32px 32px;text-align:center;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#2d3436;border-radius:6px;">
            <tr><td style="padding:18px;">
              <p style="margin:0 0 4px 0;font-size:15px;color:#ffffff;font-weight:bold;">Want this fixed? Just reply.</p>
              <p style="margin:0;font-size:13px;line-height:19px;color:#b2bec3;">Reply to this email and we'll take it from there — no dashboard, no hassle.</p>
            </td></tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:12px;color:#b2bec3;">SiteVitals watches ${escapeHtml(url)} so you don't have to.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    subject,
    '',
    narrative.headline,
    `Health score: ${composite} / 100${trendText ? ` — ${trendText}` : ''}`,
    '',
    narrative.summaryParagraph,
    '',
    "WHAT'S GOING WELL",
    ...narrative.wins.map((w) => `  + ${w}`),
    '',
    'WORTH YOUR ATTENTION',
    ...(narrative.issues.length === 0
      ? ['  Nothing needs your attention this month. Nice.']
      : narrative.issues.flatMap((issue, i) => [
          `  ${i + 1}. ${issue.title}`,
          `     ${issue.plainExplanation}`,
          `     Why it matters: ${issue.whyItMatters}`,
        ])),
    '',
    "THIS MONTH'S ONE THING",
    `  ${narrative.recommendedAction}`,
    '',
    'CATEGORY SCORES',
    ...measured.map((c) => `  ${c.label}: ${c.score}`),
    '',
    "Want this fixed? Just reply to this email and we'll take it from there.",
    `SiteVitals watches ${url} so you don't have to.`,
  ].join('\n');

  return { subject, html, text };
}
