#!/usr/bin/env node
/**
 * Create (or reuse) the SiteVitals Solo + Pro subscription prices in Stripe and
 * print the env lines to copy. Idempotent via price lookup_keys — safe to run
 * repeatedly.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe.mjs
 *   (or put STRIPE_SECRET_KEY in the repo-root .env / web .env.local and run it)
 */
import Stripe from 'stripe';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Minimal .env reader so you don't need the key exported in your shell.
function loadKey() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  const candidates = [
    join(here, '..', '.env.local'), // packages/web/.env.local
    join(here, '..', '..', '..', '..', '.env'), // outer repo root (localbiz/.env)
    join(here, '..', '..', '..', '.env'), // sitevitals/.env
  ];
  for (const path of candidates) {
    try {
      const line = readFileSync(path, 'utf8')
        .split('\n')
        .find((l) => l.startsWith('STRIPE_SECRET_KEY='));
      if (line) return line.slice('STRIPE_SECRET_KEY='.length).trim().replace(/^["']|["']$/g, '');
    } catch {
      /* file not present */
    }
  }
  return undefined;
}

const key = loadKey();
if (!key) {
  console.error(
    'STRIPE_SECRET_KEY not found. Add it to .env (sk_test_… for test mode) or pass it inline.',
  );
  process.exit(1);
}

const stripe = new Stripe(key);

const PLANS = [
  { id: 'solo', name: 'SiteVitals Solo', amount: 2900, lookupKey: 'sitevitals_solo_monthly' },
  { id: 'pro', name: 'SiteVitals Pro', amount: 4900, lookupKey: 'sitevitals_pro_monthly' },
];

async function ensurePrice(plan) {
  // Reuse an existing price with this lookup_key if present.
  const existing = await stripe.prices.list({ lookup_keys: [plan.lookupKey], active: true, limit: 1 });
  if (existing.data.length > 0) {
    return { priceId: existing.data[0].id, reused: true };
  }
  // Find or create the product (match by metadata.sitevitals_plan).
  const products = await stripe.products.search({
    query: `metadata['sitevitals_plan']:'${plan.id}'`,
  });
  const product =
    products.data[0] ??
    (await stripe.products.create({
      name: plan.name,
      metadata: { sitevitals_plan: plan.id },
    }));

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: plan.lookupKey,
    metadata: { sitevitals_plan: plan.id },
  });
  return { priceId: price.id, reused: false };
}

const mode = key.startsWith('sk_live') ? 'LIVE' : 'TEST';
console.log(`Creating SiteVitals prices in Stripe (${mode} mode)…\n`);

const out = {};
for (const plan of PLANS) {
  const { priceId, reused } = await ensurePrice(plan);
  out[plan.id] = priceId;
  console.log(`  ${plan.name}: $${plan.amount / 100}/mo → ${priceId} ${reused ? '(reused)' : '(created)'}`);
}

console.log('\nAdd these to packages/web/.env.local:\n');
console.log(`STRIPE_SECRET_KEY=${key.slice(0, 11)}…   # already set if you used .env`);
console.log(`STRIPE_PRICE_SOLO=${out.solo}`);
console.log(`STRIPE_PRICE_PRO=${out.pro}`);
console.log('\nThen set STRIPE_WEBHOOK_SECRET from your Stripe webhook (see below).');
