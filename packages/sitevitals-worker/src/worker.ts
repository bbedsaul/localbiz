import * as Sentry from '@sentry/node';
import { Queue, Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { createEmailProvider } from 'sitevitals-engine';
import { AlertEngine } from './alerts/engine.js';
import { createSmsProvider, DefaultAlertNotifier } from './alerts/notify.js';
import { loadConfig } from './config.js';
import { createServiceClient, Repo } from './db/repo.js';
import { createHttpServer } from './http/server.js';
import { runDailyJob } from './jobs/daily.js';
import { runMonthlyReportJob } from './jobs/monthly-report.js';
import { runUptimeJob } from './jobs/uptime.js';
import { runWeeklyScanJob } from './jobs/weekly-scan.js';
import { logger } from './logger.js';
import {
  QUEUE,
  TICKS,
  type BusinessJobData,
  type MonthlyReportJobData,
  type TickName,
} from './queues/definitions.js';
import {
  dailyJitterMs,
  monthlyJitterMs,
  uptimeJitterMs,
  weeklyScanDay,
} from './queues/stagger.js';

const config = loadConfig();
if (config.sentryDsn) {
  Sentry.init({ dsn: config.sentryDsn, tracesSampleRate: 0.1 });
}

const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

const repo = new Repo(createServiceClient(config.supabaseUrl, config.supabaseServiceKey));
const email = createEmailProvider();
const sms = createSmsProvider();
const notifier = new DefaultAlertNotifier(email, sms, logger, {
  fromEmail: config.alertFromEmail,
  overrideTo: config.emailOverrideTo,
});
const alerts = new AlertEngine(repo, notifier);
const deps = { repo, alerts, log: logger };

const queues = Object.fromEntries(
  Object.values(QUEUE).map((name) => [
    name,
    new Queue(name, {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 24 * 3600, count: 5000 },
        removeOnFail: { age: 7 * 24 * 3600 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    }),
  ]),
) as Record<string, Queue>;

async function scheduleTicks(): Promise<void> {
  for (const tick of TICKS) {
    await queues[QUEUE.scheduler]!.add(
      tick.name,
      {},
      {
        repeat: tick.every ? { every: tick.every } : { pattern: tick.pattern },
        jobId: `tick:${tick.name}`,
      },
    );
  }
  logger.info({ ticks: TICKS.map((t) => t.name) }, 'repeatable ticks registered');
}

/** Tick fan-out: one tick job → one queued job per active business, jittered. */
async function handleTick(tickName: TickName): Promise<void> {
  const businesses = await repo.activeBusinesses();
  const windowStamp = Math.floor(Date.now() / 60_000); // dedupe key per window

  for (const business of businesses) {
    const data: BusinessJobData = { businessId: business.id };
    switch (tickName) {
      case 'uptime-tick':
        await queues[QUEUE.uptime]!.add('uptime', data, {
          delay: uptimeJitterMs(business.id),
          jobId: `uptime:${business.id}:${windowStamp}`,
        });
        break;
      case 'daily-tick':
        await queues[QUEUE.daily]!.add('daily', data, {
          delay: dailyJitterMs(business.id),
          jobId: `daily:${business.id}:${windowStamp}`,
        });
        break;
      case 'weekly-tick':
        if (weeklyScanDay(business.id) === new Date().getUTCDay()) {
          await queues[QUEUE.weeklyScan]!.add('weekly-scan', data, {
            delay: dailyJitterMs(business.id),
            jobId: `weekly:${business.id}:${windowStamp}`,
          });
        }
        break;
      case 'monthly-tick':
        await queues[QUEUE.monthlyReport]!.add('monthly-report', data, {
          delay: monthlyJitterMs(business.id),
          jobId: `monthly:${business.id}:${windowStamp}`,
        });
        break;
    }
  }
  logger.info({ tick: tickName, businesses: businesses.length }, 'tick fanned out');
}

function wrap<T>(fn: (job: Job<T>) => Promise<void>): (job: Job<T>) => Promise<void> {
  return async (job) => {
    try {
      await fn(job);
    } catch (err) {
      logger.error({ err, queue: job.queueName, jobId: job.id, data: job.data }, 'job failed');
      Sentry.captureException(err, { extra: { queue: job.queueName, jobId: job.id } });
      throw err; // let BullMQ retry/record the failure
    }
  };
}

const workers: Worker[] = [
  new Worker(QUEUE.scheduler, wrap(async (job) => handleTick(job.name as TickName)), {
    connection,
    concurrency: 1,
  }),
  new Worker<BusinessJobData>(
    QUEUE.uptime,
    wrap(async (job) => runUptimeJob(job.data.businessId, deps)),
    { connection, concurrency: 10 },
  ),
  new Worker<BusinessJobData>(
    QUEUE.daily,
    wrap(async (job) => runDailyJob(job.data.businessId, deps)),
    { connection, concurrency: 5 },
  ),
  new Worker<BusinessJobData>(
    QUEUE.weeklyScan,
    wrap(async (job) => runWeeklyScanJob(job.data.businessId, deps)),
    { connection, concurrency: 2 }, // PageSpeed quota: keep full scans serial-ish
  ),
  new Worker<MonthlyReportJobData>(
    QUEUE.monthlyReport,
    wrap(async (job) =>
      runMonthlyReportJob(job.data.businessId, job.data.period, {
        ...deps,
        email,
        overrideTo: config.emailOverrideTo,
      }),
    ),
    { connection, concurrency: 2 },
  ),
];

const server = createHttpServer({ repo, log: logger, webhookSecret: config.resendWebhookSecret });
server.listen(config.port, () => {
  logger.info({ port: config.port }, 'http server listening (/healthz, /webhooks/resend)');
});

await scheduleTicks();
logger.info(
  { email: email?.name ?? null, sms: sms?.name ?? null, queues: Object.keys(queues) },
  'worker up',
);

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down — draining workers');
  await Promise.allSettled(workers.map((w) => w.close()));
  await Promise.allSettled(Object.values(queues).map((q) => q.close()));
  await new Promise<void>((resolve) => server.close(() => resolve()));
  connection.disconnect();
  logger.info('shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
