// Google Places API (New) types — shared platform layer. Extracted from
// Prospector so any service (Prospector lead discovery, future SiteVitals
// listing lookups) can use the Places client without cross-service imports.

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

export interface PlaceSearchResponse {
  places: PlaceSearchResult[];
  nextPageToken?: string;
}

export class PlacesApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string,
    public attempts: number,
  ) {
    super(message);
    this.name = 'PlacesApiError';
  }
}
