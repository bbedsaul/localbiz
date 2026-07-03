#!/usr/bin/env node
/**
 * Replay recent Stripe events through the same processing path as the live
 * webhook — for backfilling missed deliveries. Idempotent: skips events already
 * in the stripe_events ledger, and records the ones it applies.
 *
 * Usage:
 *   node scripts/replay-stripe-events.mjs [lookbackDays=7]
 *   (needs STRIPE_SECRET_KEY + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env/.env)
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { processEvent, applyOutcome } from '@platform/core/billing';

const here = dirname(fileURLToPath(import.meta.url));
const ENV_FILES = [join(here, '..', '.env.local'), join(here, '..', '.env'), join(here, '..', '..', '..', '.env')];

function readEnv(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
    for (const path of ENV_FILES) {
      try {
        const line = readFileSync(path, 'utf8').split('\n').find((l) => l.startsWith(`${name}=`));
        if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
      } catch {
        /* not present */
      }
    }
  }
  return undefined;
}

const stripeKey = readEnv('STRIPE_SECRET_KEY');
const supaUrl = readEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const supaKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
if (!stripeKey || !supaUrl || !supaKey) {
  console.error('Need STRIPE_SECRET_KEY + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const stripe = new Stripe(stripeKey);
const supabase = createClient(supaUrl, supaKey, { auth: { persistSession: false } });

const lookbackDays = Number(process.argv[2] ?? 7);
const since = Math.floor(Date.now() / 1000) - lookbackDays * 86400;
const TYPES = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
];

let seen = 0;
let applied = 0;
let skipped = 0;

console.log(`Replaying Stripe events of ${TYPES.length} types from the last ${lookbackDays} day(s)…`);

for await (const event of stripe.events.list({ types: TYPES, created: { gte: since }, limit: 100 })) {
  seen++;
  const { data: already } = await supabase.from('stripe_events').select('id').eq('id', event.id).maybeSingle();
  if (already) {
    skipped++;
    continue;
  }
  const result = await applyOutcome(supabase, processEvent(event));
  await supabase.from('stripe_events').upsert({ id: event.id, type: event.type }, { onConflict: 'id', ignoreDuplicates: true });
  if (result.applied) {
    applied++;
    console.log(`  applied ${event.type} → business ${result.businessId}`);
  }
}

console.log(`\nDone. Scanned ${seen}, applied ${applied}, already-processed ${skipped}.`);
