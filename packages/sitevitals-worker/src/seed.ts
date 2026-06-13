/**
 * Seed 3 test businesses for the acceptance scenario:
 *   1. example.com        — healthy control
 *   2. iana.org           — healthy multi-page site
 *   3. a dead URL         — triggers the site_down alert path (down >10 min)
 *
 * Usage: pnpm --filter sitevitals-worker seed
 * Env: SEED_OWNER_EMAIL (alert/report recipient), SEED_PHONE (optional, pro SMS)
 */
import { loadConfig } from './config.js';
import { createServiceClient } from './db/repo.js';
import { logger } from './logger.js';

const config = loadConfig();
const db = createServiceClient(config.supabaseUrl, config.supabaseServiceKey);
const ownerEmail = process.env.SEED_OWNER_EMAIL ?? 'bbedsaul@gmail.com';

const businesses = [
  {
    name: 'Test Bakery (healthy)',
    url: 'https://example.com',
    category: 'bakery',
    city: 'Austin',
    plan: 'solo',
    owner_email: ownerEmail,
    active: true,
  },
  {
    name: 'Test Plumbing (multi-page)',
    url: 'https://www.iana.org',
    category: 'plumbing',
    city: 'Austin',
    plan: 'pro',
    owner_email: ownerEmail,
    phone: process.env.SEED_PHONE ?? null,
    active: true,
  },
  {
    name: 'Test HVAC (always down)',
    url: 'https://sitevitals-downtime-test.invalid',
    category: 'hvac',
    city: 'Austin',
    plan: 'solo',
    owner_email: ownerEmail,
    active: true,
  },
];

const { data, error } = await db
  .from('businesses')
  .upsert(businesses, { onConflict: 'url' })
  .select('id, name, url');

if (error) {
  logger.error({ error }, 'seed failed');
  process.exit(1);
}

for (const row of data as { id: string; name: string; url: string }[]) {
  logger.info(row, 'seeded business');
  if (row.url === 'https://www.iana.org') {
    await db
      .from('keywords')
      .upsert(
        ['plumber austin', 'drain cleaning austin', 'water heater repair austin'].map((phrase) => ({
          business_id: row.id,
          phrase,
          is_auto: true,
        })),
        { onConflict: 'business_id,phrase' },
      );
  }
}
logger.info('seed complete — start the worker and watch the uptime queue');
process.exit(0);
