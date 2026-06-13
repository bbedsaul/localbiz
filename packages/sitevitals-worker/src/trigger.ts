/**
 * Manually enqueue a job, bypassing the schedule. Used for the acceptance
 * run and for replaying failed work.
 *
 * Usage:
 *   pnpm --filter sitevitals-worker trigger <uptime|daily|weekly-scan|monthly-report> [businessId|all] [period]
 *
 * Examples:
 *   pnpm trigger monthly-report all 2026-05
 *   pnpm trigger uptime 7b1e...-uuid
 */
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { loadConfig } from './config.js';
import { createServiceClient, Repo } from './db/repo.js';
import { logger } from './logger.js';
import { QUEUE } from './queues/definitions.js';

const [jobType, target = 'all', period] = process.argv.slice(2);
const valid = [QUEUE.uptime, QUEUE.daily, QUEUE.weeklyScan, QUEUE.monthlyReport] as string[];
if (!jobType || !valid.includes(jobType)) {
  console.error(`Usage: trigger <${valid.join('|')}> [businessId|all] [period YYYY-MM]`);
  process.exit(1);
}

const config = loadConfig();
const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const repo = new Repo(createServiceClient(config.supabaseUrl, config.supabaseServiceKey));
const queue = new Queue(jobType, { connection });

const businesses =
  target === 'all'
    ? await repo.activeBusinesses()
    : [await repo.getBusiness(target)].filter((b) => b !== null);

if (businesses.length === 0) {
  logger.error({ target }, 'no matching active businesses');
  process.exit(1);
}

for (const business of businesses) {
  const job = await queue.add(jobType, { businessId: business!.id, period });
  logger.info({ jobId: job.id, business: business!.name }, `enqueued ${jobType}`);
}

await queue.close();
connection.disconnect();
