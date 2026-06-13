/** FNV-1a — stable, dependency-free hash for spreading load by business id. */
export function hashId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Jitter within the 5-minute uptime window: 0–240s, deterministic per business. */
export function uptimeJitterMs(businessId: string): number {
  return hashId(businessId) % 240_000;
}

/** Spread daily jobs across an hour. */
export function dailyJitterMs(businessId: string): number {
  return hashId(businessId) % 3_600_000;
}

/**
 * Which UTC day-of-week (0–6) this business gets its full weekly scan —
 * staggers PageSpeed quota across the week.
 */
export function weeklyScanDay(businessId: string): number {
  return hashId(businessId) % 7;
}

/** Spread monthly report sends across 4 hours on the 1st. */
export function monthlyJitterMs(businessId: string): number {
  return hashId(businessId) % 14_400_000;
}
