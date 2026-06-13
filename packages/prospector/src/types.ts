// Google Places types (PlaceDetails, PlaceSearchResult/Response, PlacesApiError)
// now live in @platform/core/types.

export interface Prospect {
  place_id: string;
  name: string;
  phone?: string;
  rating?: number;
  review_count?: number;
  photo_count?: number;
  score: number;
  status: 'new' | 'queued' | 'contacted' | 'converted' | 'closed' | 'rejected';
  source?: 'form' | 'maps';
  city: string;
  category: string;
  created_at?: string;
  updated_at?: string;
}

export type ContactMethod = 'email' | 'phone' | 'mail';

export type OutreachResponse = 'interested' | 'not_interested' | 'no_response';

export interface OutreachRecord {
  id: number;
  place_id: string;
  queued_at: string;
  contact_method?: ContactMethod;
  contacted_at?: string;
  response?: OutreachResponse;
  responded_at?: string;
  notes?: string;
}

export interface OutreachStats {
  total: number;
  contacted: number;
  interested: number;
  not_interested: number;
  no_response: number;
}

export interface SweepParams {
  city: string;
  category: string;
}


export interface ScheduledSearch {
  id: number;
  category: string;
  city: string;
  schedule: string;
  status: 'active' | 'paused';
  last_run?: string;
  found_count: number;
  created_at: string;
}

export interface ProspectPhoto {
  id: number;
  prospect_place_id: string;
  storage_key: string;
  public_url: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  caption?: string;
  sort_order: number;
  created_at: string;
}

export interface SiteBuild {
  id: number;
  prospect_id: string;
  template: string;
  domain?: string;
  priority: 'low' | 'normal' | 'high';
  status: 'queued' | 'building' | 'live';
  started_at?: string;
  completed_at?: string;
  url?: string;
  created_at: string;
}
