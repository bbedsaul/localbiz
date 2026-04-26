import cron from 'node-cron';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runProspectorSweep } from './prospector.js';
import { promoteTopProspects } from './queue.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TargetsConfig {
  cities: string[];
  categories: string[];
}

const configPath = join(__dirname, '..', 'config', 'targets.json');
const targetsConfig: TargetsConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

const CITIES = targetsConfig.cities;
const CATEGORIES = targetsConfig.categories;

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 2 * * *';

async function runFullSweep(): Promise<void> {
  console.log('='.repeat(50));
  console.log(`Starting full prospector sweep at ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  let totalProcessed = 0;
  let totalUpserted = 0;
  let totalErrors = 0;

  for (const city of CITIES) {
    for (const category of CATEGORIES) {
      try {
        const stats = await runProspectorSweep({ city, category });
        totalProcessed += stats.processed;
        totalUpserted += stats.upserted;
        totalErrors += stats.errors;
      } catch (error) {
        console.error(`Error in sweep for ${category} in ${city}:`, error);
      }
    }
  }

  console.log('='.repeat(50));
  console.log(`Sweep complete. Processed: ${totalProcessed}, Upserted: ${totalUpserted}, Errors: ${totalErrors}`);

  // Promote top 50 prospects to outreach queue
  const promoted = await promoteTopProspects(50);
  console.log(`Promoted ${promoted} prospects to outreach queue.`);
  console.log('='.repeat(50));
}

// Schedule the cron job
console.log(`Scheduling prospector sweep with cron: ${CRON_SCHEDULE}`);
cron.schedule(CRON_SCHEDULE, runFullSweep);

// Run immediately if NODE_ENV is development
if (process.env.NODE_ENV === 'development') {
  console.log('Development mode: running sweep immediately...');
  runFullSweep().catch(console.error);
}

console.log('Prospector scheduler started. Waiting for scheduled runs...');
