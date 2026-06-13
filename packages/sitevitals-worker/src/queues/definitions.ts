export const QUEUE = {
  scheduler: 'scheduler',
  uptime: 'uptime',
  daily: 'daily',
  weeklyScan: 'weekly-scan',
  monthlyReport: 'monthly-report',
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

/** Repeatable ticks living on the scheduler queue. */
export const TICKS = [
  { name: 'uptime-tick', pattern: undefined, every: 5 * 60 * 1000 },
  { name: 'daily-tick', pattern: '0 6 * * *', every: undefined }, // 06:00 UTC daily
  { name: 'weekly-tick', pattern: '0 3 * * *', every: undefined }, // 03:00 UTC; per-business day filter staggers the week
  { name: 'monthly-tick', pattern: '0 8 1 * *', every: undefined }, // 08:00 UTC on the 1st
] as const;

export type TickName = (typeof TICKS)[number]['name'];

export interface BusinessJobData {
  businessId: string;
}

export interface MonthlyReportJobData extends BusinessJobData {
  /** 'YYYY-MM'; defaults to the month that just ended. */
  period?: string;
}

/** 'YYYY-MM' for the month containing `date`. */
export function periodOf(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** The reporting period when running on/after the 1st: the previous month. */
export function previousPeriod(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return periodOf(d);
}
