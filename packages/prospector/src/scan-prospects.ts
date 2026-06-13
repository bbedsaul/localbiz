import { pathToFileURL } from 'node:url';
import { runScan } from 'sitevitals-engine';
import { getProspectsToScan, updateProspectScan } from './db.js';

/**
 * Flywheel step: run the SiteVitals engine against every prospect that has a
 * website and store { composite, grade, scanned_at } back on the prospect, so
 * lead prioritization can immediately surface D/F-graded sites.
 *
 * This is the one place Prospector imports another service package
 * (sitevitals-engine) directly — see DECISIONS.md. The engine is a pure
 * library, so it's a safe edge; later this may move behind a core scan facade.
 */
export async function scanProspects(): Promise<number> {
  const prospects = await getProspectsToScan();
  let enriched = 0;

  for (const p of prospects) {
    if (!p.website_url) continue;
    try {
      const result = await runScan({
        url: p.website_url,
        name: p.name,
        city: p.city ?? undefined,
        category: p.category ?? undefined,
      });
      await updateProspectScan(p.place_id, {
        composite: result.scores.composite,
        grade: result.scores.grade,
        scanned_at: result.finishedAt,
      });
      enriched += 1;
      console.log(
        `scanned ${p.name} (${p.website_url}) → ${result.scores.grade} (${result.scores.composite})`,
      );
    } catch (err) {
      console.error(`failed to scan ${p.place_id} (${p.website_url}):`, err);
    }
  }

  console.log(`scan-prospects: enriched ${enriched} prospect(s) with a grade`);
  return enriched;
}

// CLI entry: `pnpm --filter prospector scan:prospects`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  scanProspects()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
