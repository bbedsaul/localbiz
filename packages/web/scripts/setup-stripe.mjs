#!/usr/bin/env node
/**
 * Create (or reuse) the SiteVitals subscription prices in Stripe — Solo/Pro ×
 * monthly/annual (annual = 10× monthly = 2 months free) — and record them in the
 * billing_prices config table. Idempotent via price lookup_keys; safe to re-run.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe.mjs
 *   (or put keys in .env / .env.local; SUPABASE creds enable the config-table write)
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ENV_FILES = [
  join(here, '..', '.env.local'),
  join(here, '..', '.env'),
  join(here, '..', '..', '..', '.env'), // repo root
];

function readEnv(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
    for (const path of ENV_FILES) {
      try {
        const line = readFileSync(path, 'utf8')
          .split('\n')
          .find((l) => l.startsWith(`${name}=`));
        if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
      } catch {
        /* not present */
      }
    }
  }
  return undefined;
}

const key = readEnv('STRIPE_SECRET_KEY');
if (!key) {
  console.error('STRIPE_SECRET_KEY not found. Add it to .env (sk_test_… for test mode).');
  process.exit(1);
}

// Safety: refuse live-mode keys unless explicitly forced.
if (key.includes('_live_') && !process.argv.includes('--live')) {
  console.error(
    'Refusing to run: this is a LIVE-mode key. Use sk_test_… for verification, or pass --live to override.',
  );
  process.exit(1);
}

const stripe = new Stripe(key);
const isLive = key.includes('_live_');

// Solo/Pro × monthly/annual. Annual = 10 months' price (2 free).
const PRICES = [
  { plan: 'solo', interval: 'monthly', name: 'SiteVitals Solo', amount: 2900, stripeInterval: 'month' },
  { plan: 'solo', interval: 'annual', name: 'SiteVitals Solo', amount: 29000, stripeInterval: 'year' },
  { plan: 'pro', interval: 'monthly', name: 'SiteVitals Pro', amount: 4900, stripeInterval: 'month' },
  { plan: 'pro', interval: 'annual', name: 'SiteVitals Pro', amount: 49000, stripeInterval: 'year' },
];
const lookupKey = (p) => `sitevitals_${p.plan}_${p.interval}`;

async function ensurePrice(p) {
  const lk = lookupKey(p);
  const existing = await stripe.prices.list({ lookup_keys: [lk], active: true, limit: 1 });
  if (existing.data.length > 0) return { priceId: existing.data[0].id, reused: true };

  const products = await stripe.products.search({
    query: `metadata['sitevitals_plan']:'${p.plan}'`,
  });
  const product =
    products.data[0] ??
    (await stripe.products.create({ name: p.name, metadata: { sitevitals_plan: p.plan } }));

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: p.amount,
    currency: 'usd',
    recurring: { interval: p.stripeInterval },
    lookup_key: lk,
    metadata: { sitevitals_plan: p.plan, interval: p.interval },
  });
  return { priceId: price.id, reused: false };
}

console.log(`Creating SiteVitals prices in Stripe (${isLive ? 'LIVE' : 'TEST'} mode)…\n`);

const rows = [];
for (const p of PRICES) {
  const { priceId, reused } = await ensurePrice(p);
  rows.push({
    lookup_key: lookupKey(p),
    stripe_price_id: priceId,
    service: 'sitevitals',
    plan: p.plan,
    interval: p.interval,
    unit_amount: p.amount,
  });
  console.log(
    `  ${p.name} ${p.interval}: $${p.amount / 100} → ${priceId} ${reused ? '(reused)' : '(created)'}`,
  );
}

// Record in the config table (billing_prices) if Supabase creds are present.
const supaUrl = readEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const supaKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
if (supaUrl && supaKey) {
  const supabase = createClient(supaUrl, supaKey, { auth: { persistSession: false } });
  const { error } = await supabase.from('billing_prices').upsert(rows, { onConflict: 'lookup_key' });
  if (error) {
    console.error(`\n⚠️  Could not write billing_prices: ${error.message}`);
    console.error('   (Apply migration 004 first, then re-run.)');
  } else {
    console.log(`\n✅ Synced ${rows.length} prices into billing_prices.`);
  }
} else {
  console.log('\n(No SUPABASE creds found — skipped billing_prices write.)');
}

// Back-compat env lines for the monthly plans (checkout falls back to these).
const monthly = Object.fromEntries(rows.filter((r) => r.interval === 'monthly').map((r) => [r.plan, r.stripe_price_id]));
console.log('\nOptional .env fallbacks (monthly):');
console.log(`STRIPE_PRICE_SOLO=${monthly.solo}`);
console.log(`STRIPE_PRICE_PRO=${monthly.pro}`);
console.log('\nThen set STRIPE_WEBHOOK_SECRET and point the Stripe webhook at /api/stripe/webhook.');
