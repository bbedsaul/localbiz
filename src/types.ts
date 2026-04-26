export interface PlaceSearchResult {
  id: string;
  displayName: {
    text: string;
  };
}

export interface PlaceDetails {
  id: string;
  displayName: {
    text: string;
  };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{ name: string }>;
}

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

export interface PlaceSearchResponse {
  places: PlaceSearchResult[];
  nextPageToken?: string;
}

export class PlacesApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string,
    public attempts: number
  ) {
    super(message);
    this.name = 'PlacesApiError';
  }
}
