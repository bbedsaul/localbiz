import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Prospect, ProspectPhoto, ScheduledSearch, SiteBuild } from './types.js';
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

export async function getTopProspectsAll(limit: number): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get top prospects: ${error.message}`);
  }

  return data as Prospect[];
}

export interface PipelineStats {
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
}

export async function getPipelineStats(): Promise<PipelineStats> {
  // Get counts by status
  const { data: statusData, error: statusError } = await supabase
    .from('prospects')
    .select('status');

  if (statusError) {
    throw new Error(`Failed to get status stats: ${statusError.message}`);
  }

  const statusCounts: Record<string, number> = {};
  for (const row of statusData || []) {
    const status = row.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  // Get counts by source
  const { data: sourceData, error: sourceError } = await supabase
    .from('prospects')
    .select('source');

  if (sourceError) {
    throw new Error(`Failed to get source stats: ${sourceError.message}`);
  }

  const sourceCounts: Record<string, number> = {};
  for (const row of sourceData || []) {
    const source = row.source || 'unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  }

  return {
    byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    bySource: Object.entries(sourceCounts).map(([source, count]) => ({ source, count })),
  };
}

// ============ Prospects API functions ============

export interface ProspectFilters {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getProspects(filters: ProspectFilters): Promise<Prospect[]> {
  let query = supabase.from('prospects').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
  }

  query = query.order('score', { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get prospects: ${error.message}`);
  }

  return data as Prospect[];
}

export interface ProspectStats {
  total: number;
  new: number;
  queued: number;
  contacted: number;
  building: number;
  live: number;
}

export async function getProspectStats(): Promise<ProspectStats> {
  const { data, error } = await supabase.from('prospects').select('status');

  if (error) {
    throw new Error(`Failed to get prospect stats: ${error.message}`);
  }

  const stats: ProspectStats = { total: 0, new: 0, queued: 0, contacted: 0, building: 0, live: 0 };
  for (const row of data || []) {
    stats.total++;
    const status = row.status as keyof Omit<ProspectStats, 'total'>;
    if (status in stats) {
      stats[status]++;
    }
  }

  return stats;
}

// ============ Forms API functions ============

export async function getFormSubmissions(): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('source', 'form')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get form submissions: ${error.message}`);
  }

  return data as Prospect[];
}

export interface FormStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export async function getFormStats(): Promise<FormStats> {
  const { data, error } = await supabase
    .from('prospects')
    .select('status')
    .eq('source', 'form');

  if (error) {
    throw new Error(`Failed to get form stats: ${error.message}`);
  }

  const stats: FormStats = { total: 0, pending: 0, approved: 0, rejected: 0 };
  for (const row of data || []) {
    stats.total++;
    if (row.status === 'new') stats.pending++;
    else if (row.status === 'queued' || row.status === 'contacted' || row.status === 'converted' || row.status === 'closed') stats.approved++;
    else if (row.status === 'rejected') stats.rejected++;
  }

  return stats;
}

// ============ Scheduled Searches API functions ============

export async function getScheduledSearches(): Promise<ScheduledSearch[]> {
  const { data, error } = await supabase
    .from('scheduled_searches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get scheduled searches: ${error.message}`);
  }

  return data as ScheduledSearch[];
}

export async function createScheduledSearch(
  category: string,
  city: string,
  schedule: string
): Promise<ScheduledSearch> {
  const { data, error } = await supabase
    .from('scheduled_searches')
    .insert({ category, city, schedule })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create scheduled search: ${error.message}`);
  }

  return data as ScheduledSearch;
}

export async function updateScheduledSearch(
  id: number,
  updates: { status?: string; last_run?: string; found_count?: number }
): Promise<void> {
  const { error } = await supabase
    .from('scheduled_searches')
    .update(updates)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update scheduled search: ${error.message}`);
  }
}

export async function deleteScheduledSearch(id: number): Promise<void> {
  const { error } = await supabase
    .from('scheduled_searches')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete scheduled search: ${error.message}`);
  }
}

export async function getScheduledSearchById(id: number): Promise<ScheduledSearch | null> {
  const { data, error } = await supabase
    .from('scheduled_searches')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get scheduled search: ${error.message}`);
  }

  return data as ScheduledSearch | null;
}

// ============ Site Builds API functions ============

export async function getSiteBuilds(): Promise<SiteBuild[]> {
  const { data, error } = await supabase
    .from('site_builds')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get site builds: ${error.message}`);
  }

  return data as SiteBuild[];
}

export interface BuildStats {
  total: number;
  queued: number;
  building: number;
  live: number;
}

export async function getBuildStats(): Promise<BuildStats> {
  const { data, error } = await supabase.from('site_builds').select('status');

  if (error) {
    throw new Error(`Failed to get build stats: ${error.message}`);
  }

  const stats: BuildStats = { total: 0, queued: 0, building: 0, live: 0 };
  for (const row of data || []) {
    stats.total++;
    const status = row.status as keyof Omit<BuildStats, 'total'>;
    if (status in stats) {
      stats[status]++;
    }
  }

  return stats;
}

export async function createSiteBuild(
  prospectId: string,
  template: string,
  domain?: string,
  priority?: string
): Promise<SiteBuild> {
  const { data, error } = await supabase
    .from('site_builds')
    .insert({
      prospect_id: prospectId,
      template,
      domain: domain || null,
      priority: priority || 'normal',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create site build: ${error.message}`);
  }

  return data as SiteBuild;
}

export async function updateSiteBuild(
  id: number,
  updates: { status?: string; started_at?: string; completed_at?: string; url?: string }
): Promise<void> {
  const { error } = await supabase
    .from('site_builds')
    .update(updates)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update site build: ${error.message}`);
  }
}

// ============ Prospect Photos API functions ============

export interface InsertProspectPhotoInput {
  prospect_place_id: string;
  storage_key: string;
  public_url: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  caption?: string;
  sort_order: number;
}

export async function insertProspectPhoto(input: InsertProspectPhotoInput): Promise<ProspectPhoto> {
  const { data, error } = await supabase
    .from('prospect_photos')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert prospect photo: ${error.message}`);
  }

  return data as ProspectPhoto;
}

export async function getProspectPhotos(prospectPlaceId: string): Promise<ProspectPhoto[]> {
  const { data, error } = await supabase
    .from('prospect_photos')
    .select('*')
    .eq('prospect_place_id', prospectPlaceId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to get prospect photos: ${error.message}`);
  }

  return data as ProspectPhoto[];
}

export async function getProspectPhotoById(photoId: number): Promise<ProspectPhoto | null> {
  const { data, error } = await supabase
    .from('prospect_photos')
    .select('*')
    .eq('id', photoId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get prospect photo: ${error.message}`);
  }

  return data as ProspectPhoto | null;
}

export async function deleteProspectPhoto(photoId: number): Promise<void> {
  const { error } = await supabase
    .from('prospect_photos')
    .delete()
    .eq('id', photoId);

  if (error) {
    throw new Error(`Failed to delete prospect photo: ${error.message}`);
  }
}
