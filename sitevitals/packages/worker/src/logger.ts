import { pino } from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'sitevitals-worker' },
});

export type Logger = typeof logger;
