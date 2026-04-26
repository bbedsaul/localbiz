import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Prospect } from './types.js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export async function upsertProspect(prospect: Prospect): Promise<void> {
  const { error } = await supabase.from('prospects').upsert(
    {
      place_id: prospect.place_id,
      name: prospect.name,
      phone: prospect.phone,
      rating: prospect.rating,
      review_count: prospect.review_count,
      photo_count: prospect.photo_count,
      score: prospect.score,
      status: prospect.status,
      source: prospect.source,
      city: prospect.city,
      category: prospect.category,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'place_id' }
  );

  if (error) {
    throw new Error(`Failed to upsert prospect: ${error.message}`);
  }
}

export async function findByPlaceId(placeId: string): Promise<Prospect | null> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('place_id', placeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find prospect: ${error.message}`);
  }

  return data as Prospect | null;
}

export async function getTopProspects(limit: number): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('status', 'new')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get top prospects: ${error.message}`);
  }

  return data as Prospect[];
}

export async function updateProspectStatus(
  placeId: string,
  status: Prospect['status']
): Promise<void> {
  const { error } = await supabase
    .from('prospects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('place_id', placeId);

  if (error) {
    throw new Error(`Failed to update prospect status: ${error.message}`);
  }
}

export async function insertToOutreachQueue(placeId: string): Promise<void> {
  const { error } = await supabase.from('outreach_queue').insert({ place_id: placeId });

  if (error) {
    throw new Error(`Failed to insert to outreach queue: ${error.message}`);
  }
}
