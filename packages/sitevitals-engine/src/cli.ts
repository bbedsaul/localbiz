#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { createEmailProvider } from './delivery/email-provider.js';
import { suggestKeywords } from './keywords.js';
import { narrate } from './report/narrate.js';
import { prioritizeIssues } from './report/prioritize.js';
import { renderReportEmail } from './report/template.js';
import { computeTrend } from './report/trend.js';
import { runScan } from './runner.js';
import type { CheckResult, ScanResult } from './types.js';
import { normalizeUrl } from './util/http.js';
import { nameFromDomain } from './util/nap.js';

const USAGE = `Usage:
  pnpm engine scan <url> [options]
  pnpm engine report <scan.json> [--to email@x.com] [--business "Joe's HVAC"]
                     [--previous prev-scan.json] [--out report.html]

scan: runs all SiteVitals checks against <url> and prints a summary.
  --json <file>     also write the full ScanResult JSON to <file>
  --category        business category ("HVAC"); with --city, used to suggest keywords
  --city            business city ("Austin"); pass "Austin,Texas,United States" for
                    precise local rankings (DataForSEO canonical location name)
  --name            business name for listing lookups (default: derived from domain)
  --keywords        comma-separated tracked keywords, max 5 ("hvac repair austin,...")

report: turns a ScanResult JSON into the monthly report-card email.
  --to <email>      send via Resend (needs RESEND_API_KEY)
  --business        business name shown in the report (default: derived from domain)
  --previous        previous period's scan JSON, used to compute the trend
  --out <file>      write the rendered HTML for preview

Optional env: PAGESPEED_API_KEY, SAFE_BROWSING_API_KEY (GOOGLE_API_KEY covers both),
DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD (or SERP_PROVIDER=serpapi + SERPAPI_KEY),
GOOGLE_PLACES_API_KEY, YELP_API_KEY, FACEBOOK_ACCESS_TOKEN.
For reports: ANTHROPIC_API_KEY (narration; falls back to a non-AI template),
RESEND_API_KEY + REPORT_FROM_EMAIL (delivery).
Checks needing a missing key are reported as "skipped".`;

function bestPosition(rankings: { position: number | null }[]): string {
  const positions = rankings
    .map((r) => r.position)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);
  return positions.length > 0 ? `#${positions[0]}` : 'not in top 50';
}

function statusIcon(result: CheckResult): string {
  return result.status === 'ok' ? '✓' : result.status === 'skipped' ? '–' : '✗';
}

function summarize(result: ScanResult): string {
  const { checks } = result;
  const c = checks.crawl.raw;
  const psi = checks.pagespeed.raw;
  const https = checks.httpsEnforced.raw;
  const lv = checks.localVisibility.raw;
  const nap = checks.napConsistency.raw;
  const detail: Record<keyof ScanResult['checks'], string> = {
    uptime: checks.uptime.raw
      ? `HTTP ${checks.uptime.raw.statusCode} in ${checks.uptime.raw.responseTimeMs}ms, ${checks.uptime.raw.redirects.length} redirect(s)`
      : '',
    ssl: checks.ssl.raw
      ? `${checks.ssl.raw.valid ? 'valid' : 'INVALID'}, expires in ${checks.ssl.raw.daysRemaining}d (${checks.ssl.raw.issuer ?? 'unknown issuer'})`
      : '',
    domain: checks.domain.raw
      ? checks.domain.raw.supported
        ? `expires in ${checks.domain.raw.daysRemaining ?? '?'}d (${checks.domain.raw.registrar ?? 'unknown registrar'})`
        : 'RDAP unsupported for this domain'
      : '',
    crawl: c
      ? `${c.pagesCrawled} pages, ${c.brokenLinks.length} broken links, ${c.imagesMissingAlt.length}/${c.totalImages} imgs missing alt, sitemap:${c.hasSitemap ? 'y' : 'n'} robots:${c.hasRobotsTxt ? 'y' : 'n'}`
      : '',
    pagespeed: psi
      ? `mobile ${psi.mobile?.performanceScore ?? '–'} / desktop ${psi.desktop?.performanceScore ?? '–'}, LCP ${psi.mobile?.lcpMs ? Math.round(psi.mobile.lcpMs) + 'ms' : '–'}`
      : '',
    safebrowsing: checks.safebrowsing.raw
      ? checks.safebrowsing.raw.flagged
        ? `FLAGGED: ${checks.safebrowsing.raw.threats.join(', ')}`
        : 'clean'
      : '',
    httpsEnforced: https
      ? `redirects:${https.httpRedirectsToHttps ? 'y' : 'n'}, mixed content: ${https.mixedContentCount}`
      : '',
    localVisibility: lv
      ? `${lv.rankings.length} keyword(s), best position ${bestPosition(lv.rankings)}, map pack:${lv.inMapPack ? 'y' : 'n'} [${lv.provider}]`
      : '',
    napConsistency: nap
      ? `${nap.foundCount}/${nap.listings.filter((l) => !l.unavailableReason).length} listings found, ${nap.mismatches.length} mismatch(es)${nap.mismatches.length ? ` (${nap.mismatches.map((m) => m.field).join(', ')})` : ''}`
      : '',
  };

  const lines: string[] = [];
  lines.push('');
  lines.push(`SiteVitals scan — ${result.url}`);
  lines.push(`Completed in ${(result.durationMs / 1000).toFixed(1)}s`);
  lines.push('');
  lines.push('CHECKS');
  for (const [name, check] of Object.entries(checks) as [
    keyof ScanResult['checks'],
    CheckResult,
  ][]) {
    const info = check.status === 'ok' ? detail[name] : (check.error ?? '');
    lines.push(
      `  ${statusIcon(check)} ${name.padEnd(14)} ${check.status.padEnd(8)} ${info}`.trimEnd(),
    );
  }
  lines.push('');
  lines.push('SCORES');
  for (const cat of result.scores.categories) {
    const value = cat.score === null ? 'not measured' : String(cat.score);
    lines.push(
      `  ${cat.label.padEnd(30)} ${`(${Math.round(cat.weight * 100)}%)`.padStart(5)}  ${value}`,
    );
  }
  lines.push('');
  lines.push(`  Composite: ${result.scores.composite}   Grade: ${result.scores.grade}`);
  if (lv?.serpCostUsd !== null && lv?.serpCostUsd !== undefined) {
    lines.push(`  SERP cost this scan: $${lv.serpCostUsd.toFixed(4)} (${lv.provider})`);
  }
  lines.push('');
  return lines.join('\n');
}

async function reportCommand(
  scanPath: string,
  values: { to?: string; business?: string; previous?: string; out?: string },
): Promise<number> {
  const scan = JSON.parse(await readFile(scanPath, 'utf8')) as ScanResult;
  if (!scan.url || !scan.scores || !scan.checks) {
    console.error(`sitevitals: ${scanPath} does not look like a ScanResult JSON`);
    return 1;
  }
  const previous = values.previous
    ? (JSON.parse(await readFile(values.previous, 'utf8')) as ScanResult)
    : null;

  const business =
    values.business ?? nameFromDomain(new URL(normalizeUrl(scan.url)).hostname) ?? scan.url;
  const period = new Date(scan.finishedAt).toLocaleString('en-US', { month: 'long' });
  const trend = previous ? computeTrend(scan, previous) : null;
  const { wins, issues } = prioritizeIssues(scan);

  console.log(`Generating ${period} report for ${business} (${issues.length} issue(s) found) …`);
  const started = Date.now();
  const narration = await narrate({
    business,
    period,
    grade: scan.scores.grade,
    composite: scan.scores.composite,
    trend,
    wins,
    issues: issues.slice(0, 3),
  });
  console.log(
    `Narration: ${narration.source}${narration.model ? ` (${narration.model})` : ''} in ${((Date.now() - started) / 1000).toFixed(1)}s${narration.reason ? ` — ${narration.reason}` : ''}`,
  );

  const email = renderReportEmail({
    business,
    period,
    grade: scan.scores.grade,
    composite: scan.scores.composite,
    trend,
    narrative: narration.narrative,
    categories: scan.scores.categories,
    url: scan.url,
  });
  console.log(`Subject: ${email.subject}`);

  if (values.out) {
    await writeFile(values.out, email.html, 'utf8');
    console.log(`HTML preview written to ${values.out}`);
  }

  if (values.to) {
    const provider = createEmailProvider();
    if (!provider) {
      console.error('sitevitals: cannot send — RESEND_API_KEY not set');
      return 1;
    }
    const { id } = await provider.send({
      to: values.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: {
        business_id: business,
        period: scan.finishedAt.slice(0, 7),
      },
    });
    console.log(`Sent via ${provider.name} to ${values.to} (id: ${id})`);
  }

  if (!values.out && !values.to) {
    console.log('\n' + email.text);
  }
  return 0;
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      json: { type: 'string' },
      category: { type: 'string' },
      city: { type: 'string' },
      name: { type: 'string' },
      keywords: { type: 'string' },
      to: { type: 'string' },
      business: { type: 'string' },
      previous: { type: 'string' },
      out: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  const [command, target] = positionals;
  if (values.help || !command || !target) {
    console.log(USAGE);
    return values.help ? 0 : 1;
  }
  if (command === 'report') {
    return reportCommand(target, values);
  }
  if (command !== 'scan') {
    console.log(USAGE);
    return 1;
  }
  const url = target;

  let keywords = values.keywords
    ?.split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (!keywords?.length && values.category && values.city) {
    keywords = suggestKeywords(values.category, values.city);
    console.log(`No --keywords given; tracking suggested keywords: ${keywords.join(', ')}`);
  }

  console.log(`Scanning ${url} …`);
  const result = await runScan({
    url,
    category: values.category,
    city: values.city,
    name: values.name,
    keywords,
  });
  console.log(summarize(result));

  if (values.json) {
    await writeFile(values.json, JSON.stringify(result, null, 2), 'utf8');
    console.log(`Full ScanResult written to ${values.json}`);
  }
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    // runScan never throws; this catches CLI-level problems (bad args, unwritable --json path).
    console.error(`sitevitals: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
