/*
 * Delete test prospects (and their photos in storage) from the database.
 *
 * Usage:
 *   npm run cleanup:test -- --name-prefix=Test
 *   npm run cleanup:test -- --place-id=form-abc --place-id=form-def
 *   npm run cleanup:test -- --name-prefix=Test --commit
 *
 * Defaults to dry-run. Pass `--commit` to actually delete.
 */

import { supabase } from './db.js';
import { storage } from './lib/storage.js';
import 'dotenv/config';

interface Args {
  placeIds: string[];
  namePrefix: string | null;
  commit: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { placeIds: [], namePrefix: null, commit: false };
  for (const a of argv) {
    if (a === '--commit') args.commit = true;
    else if (a.startsWith('--place-id=')) args.placeIds.push(a.slice('--place-id='.length));
    else if (a.startsWith('--name-prefix=')) args.namePrefix = a.slice('--name-prefix='.length);
  }
  return args;
}

interface Match {
  place_id: string;
  name: string;
  city: string;
}

async function findTargets(args: Args): Promise<Match[]> {
  let query = supabase.from('prospects').select('place_id, name, city');

  if (args.placeIds.length > 0) {
    query = query.in('place_id', args.placeIds);
  } else if (args.namePrefix) {
    query = query.ilike('name', `${args.namePrefix}%`);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query prospects: ${error.message}`);
  return (data || []) as Match[];
}

async function getPhotoKeys(placeId: string): Promise<{ id: number; storage_key: string }[]> {
  const { data, error } = await supabase
    .from('prospect_photos')
    .select('id, storage_key')
    .eq('prospect_place_id', placeId);
  if (error) throw new Error(`Failed to query photos for ${placeId}: ${error.message}`);
  return (data || []) as { id: number; storage_key: string }[];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.placeIds.length === 0 && !args.namePrefix) {
    console.error('Error: must pass --place-id=... (repeatable) or --name-prefix=...');
    console.error('See header of src/cleanup-test-prospects.ts for usage.');
    process.exit(1);
  }

  const targets = await findTargets(args);
  if (targets.length === 0) {
    console.log('No matching prospects found.');
    return;
  }

  console.log(`${args.commit ? 'DELETING' : 'DRY RUN — would delete'} ${targets.length} prospect(s):`);
  let totalPhotos = 0;
  for (const t of targets) {
    const photos = await getPhotoKeys(t.place_id);
    totalPhotos += photos.length;
    console.log(`  • ${t.name} (${t.city}) — ${t.place_id}  [${photos.length} photo${photos.length === 1 ? '' : 's'}]`);
    for (const p of photos) console.log(`      - ${p.storage_key}`);
  }
  console.log(`Total: ${targets.length} prospects, ${totalPhotos} storage objects.`);

  if (!args.commit) {
    console.log('\nRe-run with --commit to delete.');
    return;
  }

  for (const t of targets) {
    const photos = await getPhotoKeys(t.place_id);
    for (const p of photos) {
      try {
        await storage.delete(p.storage_key);
      } catch (err) {
        console.error(`  Failed to delete storage object ${p.storage_key}:`, err);
      }
    }
    const { error } = await supabase.from('prospects').delete().eq('place_id', t.place_id);
    if (error) {
      console.error(`  Failed to delete prospect ${t.place_id}: ${error.message}`);
    } else {
      console.log(`  ✓ deleted ${t.name}`);
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('cleanup failed:', err);
  process.exit(1);
});
