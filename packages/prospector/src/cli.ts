import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { runProspectorSweep } from './prospector.js';
import { promoteTopProspects } from './queue.js';
import { getTopProspectsAll, getPipelineStats, getHotLeads } from './db.js';
import 'dotenv/config';

const rl = readline.createInterface({ input, output });

function printMenu(): void {
  console.log('\n========================================');
  console.log('       PROSPECTOR CLI');
  console.log('========================================');
  console.log('1. Run a manual sweep');
  console.log('2. Show top 10 prospects by score');
  console.log('3. Show hot leads (D/F website scan grade)');
  console.log('4. Show pipeline stats');
  console.log('5. Promote top prospects to outreach queue');
  console.log('6. Exit');
  console.log('========================================\n');
}

async function runManualSweep(): Promise<void> {
  const city = await rl.question('Enter city (e.g., "Austin TX"): ');
  const category = await rl.question('Enter category (e.g., "plumber"): ');

  if (!city.trim() || !category.trim()) {
    console.log('City and category are required.');
    return;
  }

  console.log(`\nRunning sweep for "${category}" in "${city}"...`);

  try {
    const stats = await runProspectorSweep({ city: city.trim(), category: category.trim() });
    console.log(`\nSweep complete!`);
    console.log(`  Processed: ${stats.processed}`);
    console.log(`  Skipped (has website): ${stats.skipped}`);
    console.log(`  Upserted: ${stats.upserted}`);
    console.log(`  Errors: ${stats.errors}`);
  } catch (error) {
    console.error('Sweep failed:', error);
  }
}

async function showTopProspects(): Promise<void> {
  console.log('\nFetching top 10 prospects...\n');

  try {
    const prospects = await getTopProspectsAll(10);

    if (prospects.length === 0) {
      console.log('No prospects found.');
      return;
    }

    // Print header
    console.log('RANK | SCORE | NAME                           | CITY            | PHONE          | STATUS');
    console.log('-----|-------|--------------------------------|-----------------|----------------|--------');

    // Print rows
    prospects.forEach((p, i) => {
      const rank = String(i + 1).padStart(4);
      const score = String(p.score).padStart(5);
      const name = (p.name || '').slice(0, 30).padEnd(30);
      const city = (p.city || '').slice(0, 15).padEnd(15);
      const phone = (p.phone || 'N/A').slice(0, 14).padEnd(14);
      const status = p.status || 'unknown';
      console.log(`${rank} | ${score} | ${name} | ${city} | ${phone} | ${status}`);
    });
  } catch (error) {
    console.error('Failed to fetch prospects:', error);
  }
}

async function showHotLeads(): Promise<void> {
  console.log('\nFetching hot leads (D/F website scan grade, worst first)...\n');

  try {
    const prospects = await getHotLeads(20);

    if (prospects.length === 0) {
      console.log('No hot leads found. Run `scan:prospects` to grade prospect websites first.');
      return;
    }

    // Print header
    console.log('RANK | GRADE | SCORE | NAME                           | CITY            | PHONE');
    console.log('-----|-------|-------|--------------------------------|-----------------|---------------');

    // Print rows — worst sites are the hottest sales targets
    prospects.forEach((p, i) => {
      const rank = String(i + 1).padStart(4);
      const grade = String(p.scan?.grade ?? '?').padStart(5);
      const score = String(p.scan?.composite ?? 0).padStart(5);
      const name = (p.name || '').slice(0, 30).padEnd(30);
      const city = (p.city || '').slice(0, 15).padEnd(15);
      const phone = (p.phone || 'N/A').slice(0, 14).padEnd(14);
      console.log(`${rank} | ${grade} | ${score} | ${name} | ${city} | ${phone}`);
    });
  } catch (error) {
    console.error('Failed to fetch hot leads:', error);
  }
}

async function showPipelineStats(): Promise<void> {
  console.log('\nFetching pipeline stats...\n');

  try {
    const stats = await getPipelineStats();

    console.log('=== BY STATUS ===');
    if (stats.byStatus.length === 0) {
      console.log('  No data');
    } else {
      let total = 0;
      for (const { status, count } of stats.byStatus) {
        console.log(`  ${status.padEnd(12)}: ${count}`);
        total += count;
      }
      console.log(`  ${'TOTAL'.padEnd(12)}: ${total}`);
    }

    console.log('\n=== BY SOURCE ===');
    if (stats.bySource.length === 0) {
      console.log('  No data');
    } else {
      for (const { source, count } of stats.bySource) {
        console.log(`  ${source.padEnd(12)}: ${count}`);
      }
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
}

async function promoteProspects(): Promise<void> {
  const input = await rl.question('Promote how many? (default 10): ');
  const count = parseInt(input.trim(), 10) || 10;

  console.log(`\nPromoting top ${count} prospects to outreach queue...`);

  try {
    const promoted = await promoteTopProspects(count);
    console.log(`\nPromoted ${promoted} prospects to outreach queue.`);
  } catch (error) {
    console.error('Failed to promote prospects:', error);
  }
}

async function main(): Promise<void> {
  console.log('\nWelcome to Prospector CLI!');

  let running = true;

  while (running) {
    printMenu();

    const choice = await rl.question('Select an option (1-6): ');

    switch (choice.trim()) {
      case '1':
        await runManualSweep();
        break;
      case '2':
        await showTopProspects();
        break;
      case '3':
        await showHotLeads();
        break;
      case '4':
        await showPipelineStats();
        break;
      case '5':
        await promoteProspects();
        break;
      case '6':
        running = false;
        console.log('\nGoodbye!\n');
        break;
      default:
        console.log('\nInvalid option. Please enter 1-6.');
    }
  }

  rl.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('CLI error:', error);
  rl.close();
  process.exit(1);
});
