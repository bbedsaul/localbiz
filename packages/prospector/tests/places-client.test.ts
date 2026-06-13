import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { PlacesApiError } from '@platform/core/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAxiosPost = jest.fn<() => Promise<any>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAxiosGet = jest.fn<() => Promise<any>>();

class MockAxiosError extends Error {
  response?: { status: number; statusText: string; data: unknown; headers: object; config: object };
  isAxiosError = true;

  constructor(message: string) {
    super(message);
    this.name = 'AxiosError';
  }
}

jest.unstable_mockModule('axios', () => {
  return {
    default: {
      post: mockAxiosPost,
      get: mockAxiosGet,
    },
    AxiosError: MockAxiosError,
  };
});

let searchPlaces: typeof import('@platform/core/places').searchPlaces;
let getPlaceDetails: typeof import('@platform/core/places').getPlaceDetails;

beforeAll(async () => {
  jest.useFakeTimers();
  const placesClient = await import('@platform/core/places');
  searchPlaces = placesClient.searchPlaces;
  getPlaceDetails = placesClient.getPlaceDetails;
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  mockAxiosPost.mockReset();
  mockAxiosGet.mockReset();
});

function createAxiosError(status: number): MockAxiosError {
  const error = new MockAxiosError(`Request failed with status ${status}`);
  error.response = {
    status,
    statusText: status === 429 ? 'Too Many Requests' : 'Service Unavailable',
    headers: {},
    config: { headers: {} },
    data: { error: { message: `Error ${status}` } },
  };
  return error;
}

describe('places-client retry logic', () => {
  describe('searchPlaces', () => {
    it('should retry on 429 and succeed after retries', async () => {
      mockAxiosPost
        .mockRejectedValueOnce(createAxiosError(429))
        .mockRejectedValueOnce(createAxiosError(429))
        .mockResolvedValueOnce({
          data: {
            places: [{ id: 'place-1', displayName: { text: 'Test Place' } }],
          },
        });

      const resultPromise = searchPlaces('plumber in Austin TX');
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.places).toHaveLength(1);
      expect(result.places[0].id).toBe('place-1');
      expect(mockAxiosPost).toHaveBeenCalledTimes(3);
    });

    it('should throw PlacesApiError after 3 failed attempts with 503', async () => {
      mockAxiosPost
        .mockRejectedValueOnce(createAxiosError(503))
        .mockRejectedValueOnce(createAxiosError(503))
        .mockRejectedValueOnce(createAxiosError(503));

      const resultPromise = searchPlaces('plumber in Austin TX');
      jest.runAllTimersAsync();

      let thrownError: PlacesApiError | null = null;
      try {
        await resultPromise;
      } catch (error) {
        thrownError = error as PlacesApiError;
      }

      expect(thrownError).toBeInstanceOf(PlacesApiError);
      expect(thrownError?.status).toBe(503);
      expect(thrownError?.attempts).toBe(3);
      expect(mockAxiosPost).toHaveBeenCalledTimes(3);
    });

    it('should include correct url in error details', async () => {
      mockAxiosPost
        .mockRejectedValueOnce(createAxiosError(503))
        .mockRejectedValueOnce(createAxiosError(503))
        .mockRejectedValueOnce(createAxiosError(503));

      const resultPromise = searchPlaces('plumber in Austin TX');
      jest.runAllTimersAsync();

      let thrownError: PlacesApiError | null = null;
      try {
        await resultPromise;
      } catch (error) {
        thrownError = error as PlacesApiError;
      }

      expect(thrownError?.url).toContain('places:searchText');
    });

    it('should double delay between retries (1s, 2s)', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      mockAxiosPost
        .mockRejectedValueOnce(createAxiosError(429))
        .mockRejectedValueOnce(createAxiosError(429))
        .mockResolvedValueOnce({
          data: { places: [{ id: 'place-1', displayName: { text: 'Test' } }] },
        });

      const resultPromise = searchPlaces('plumber in Austin TX');
      await jest.runAllTimersAsync();
      await resultPromise;

      // Verify exponential backoff via logged messages
      const calls = logSpy.mock.calls.map(c => c[0] as string);
      expect(calls).toContainEqual(expect.stringContaining('after 1000ms'));
      expect(calls).toContainEqual(expect.stringContaining('after 2000ms'));

      logSpy.mockRestore();
    });
  });

  describe('getPlaceDetails', () => {
    it('should retry on 429 and succeed', async () => {
      mockAxiosGet
        .mockRejectedValueOnce(createAxiosError(429))
        .mockResolvedValueOnce({
          data: {
            id: 'place-123',
            displayName: { text: 'Test Business' },
          },
        });

      const resultPromise = getPlaceDetails('place-123');
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.id).toBe('place-123');
      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });

    it('should throw PlacesApiError on non-retryable error (404)', async () => {
      mockAxiosGet.mockRejectedValueOnce(createAxiosError(404));

      const resultPromise = getPlaceDetails('invalid-place');
      jest.runAllTimersAsync();

      let thrownError: PlacesApiError | null = null;
      try {
        await resultPromise;
      } catch (error) {
        thrownError = error as PlacesApiError;
      }

      expect(thrownError).toBeInstanceOf(PlacesApiError);
      expect(thrownError?.status).toBe(404);
      expect(thrownError?.attempts).toBe(1);
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    });
  });
});
