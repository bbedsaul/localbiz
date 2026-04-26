import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { PlaceDetails, PlaceSearchResponse, PlacesApiError } from './types.js';
import 'dotenv/config';

const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const API_KEY = process.env.GOOGLE_API_KEY;

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = [429, 503];

if (!API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY environment variable');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  url: string
): Promise<T> {
  let lastError: AxiosError | null = null;
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        lastStatus = status || 0;
        lastError = error;

        // Non-retryable error - throw immediately
        if (!status || !RETRYABLE_STATUS_CODES.includes(status)) {
          const errorData = error.response?.data as { error?: { message?: string } } | undefined;
          throw new PlacesApiError(
            `Places API request failed: ${errorData?.error?.message || error.message}`,
            lastStatus,
            url,
            attempt
          );
        }

        // Retryable error - retry if we have attempts left
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(
            `[Places] Retry ${attempt}/${MAX_RETRIES} for ${url} after ${delay}ms (status: ${status})`
          );
          await sleep(delay);
          continue;
        }
        // Last attempt with retryable error - will throw after loop
      } else {
        // Non-Axios error - throw immediately
        throw error;
      }
    }
  }

  // All retries exhausted
  const errorData = lastError?.response?.data as { error?: { message?: string } } | undefined;
  throw new PlacesApiError(
    `Places API request failed after ${MAX_RETRIES} attempts: ${errorData?.error?.message || lastError?.message}`,
    lastStatus,
    url,
    MAX_RETRIES
  );
}

export async function searchPlaces(
  query: string,
  pageToken?: string
): Promise<PlaceSearchResponse> {
  const url = `${PLACES_API_BASE}/places:searchText`;
  const fieldMask = 'places.id,places.displayName,nextPageToken';

  const response = await retryWithBackoff(
    () =>
      axios.post(
        url,
        {
          textQuery: query,
          pageToken: pageToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': fieldMask,
          },
        }
      ),
    url
  );

  return {
    places: response.data.places || [],
    nextPageToken: response.data.nextPageToken,
  };
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const url = `${PLACES_API_BASE}/places/${placeId}`;
  const fieldMask =
    'id,displayName,websiteUri,nationalPhoneNumber,rating,userRatingCount,photos';

  const response = await retryWithBackoff(
    () =>
      axios.get(url, {
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': fieldMask,
        },
      }),
    url
  );

  return response.data as PlaceDetails;
}

export { PlacesApiError };
