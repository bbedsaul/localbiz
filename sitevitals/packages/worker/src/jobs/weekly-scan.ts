import { runScan, suggestKeywords } from '@sitevitals/engine';
import { periodOf } from '../queues/definitions.js';
import type { JobDeps } from './uptime.js';

/**
 * Full weekly ScanResult: persists every check's result row, a 'full_scan'
 * row holding the whole ScanResult (the report job's input), and upserts the
 * current period's scores.
 */
export async function runWeeklyScanJob(businessId: string, deps: JobDeps): Promise<void> {
  const { repo, log } = deps;
  const business = await repo.getBusiness(businessId);
  if (!business?.active) return;

  let keywords = await repo.keywordsFor(business.id);
  if (keywords.length === 0 && business.category && business.city) {
    keywords = suggestKeywords(business.category, business.city);
  }

  const scan = await runScan({
    url: business.url,
    name: business.name,
    category: business.category ?? undefined,
    city: business.city ?? undefined,
    keywords,
  });

  for (const check of Object.values(scan.checks)) {
    await repo.insertCheckResult(business.id, check.type, '7d', check, null);
  }
  await repo.insertCheckResult(
    business.id,
    'full_scan',
    '7d',
    { status: 'ok', raw: scan, ranAt: scan.finishedAt },
    scan.scores.composite,
  );
  await repo.upsertScores(business.id, periodOf(new Date(scan.finishedAt)), scan.scores);

  log.info(
    {
      businessId,
      grade: scan.scores.grade,
      composite: scan.scores.composite,
      durationMs: scan.durationMs,
      serpCostUsd: scan.checks.localVisibility.raw?.serpCostUsd ?? null,
    },
    'weekly scan complete',
  );
}
