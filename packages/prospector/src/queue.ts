import { getTopProspects, updateProspectStatus, insertToOutreachQueue, supabase } from './db.js';
import { ContactMethod, OutreachResponse, OutreachStats } from './types.js';

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

export async function markContacted(placeId: string, method: ContactMethod): Promise<void> {
  const { error: outreachError } = await supabase
    .from('outreach_queue')
    .update({
      contact_method: method,
      contacted_at: new Date().toISOString(),
    })
    .eq('place_id', placeId);

  if (outreachError) {
    throw new Error(`Failed to mark contacted: ${outreachError.message}`);
  }

  await updateProspectStatus(placeId, 'contacted');
}

export async function recordResponse(
  placeId: string,
  response: OutreachResponse,
  notes?: string
): Promise<void> {
  const { error: outreachError } = await supabase
    .from('outreach_queue')
    .update({
      response,
      responded_at: new Date().toISOString(),
      notes: notes || null,
    })
    .eq('place_id', placeId);

  if (outreachError) {
    throw new Error(`Failed to record response: ${outreachError.message}`);
  }

  if (response === 'interested') {
    await updateProspectStatus(placeId, 'closed');
  } else if (response === 'not_interested') {
    await updateProspectStatus(placeId, 'rejected');
  }
}

export async function getOutreachStats(): Promise<OutreachStats> {
  const { data, error } = await supabase.from('outreach_queue').select('*');

  if (error) {
    throw new Error(`Failed to get outreach stats: ${error.message}`);
  }

  const records = data || [];

  return {
    total: records.length,
    contacted: records.filter((r) => r.contacted_at != null).length,
    interested: records.filter((r) => r.response === 'interested').length,
    not_interested: records.filter((r) => r.response === 'not_interested').length,
    no_response: records.filter((r) => r.response === 'no_response').length,
  };
}
