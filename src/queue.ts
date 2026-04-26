import { getTopProspects, updateProspectStatus, insertToOutreachQueue } from './db.js';

export async function promoteTopProspects(limit: number): Promise<number> {
  console.log(`Promoting top ${limit} prospects to outreach queue...`);

  const prospects = await getTopProspects(limit);

  for (const prospect of prospects) {
    await insertToOutreachQueue(prospect.place_id);
    await updateProspectStatus(prospect.place_id, 'queued');
    console.log(`Queued: ${prospect.name} (score: ${prospect.score})`);
  }

  console.log(`Promoted ${prospects.length} prospects to outreach queue.`);
  return prospects.length;
}
