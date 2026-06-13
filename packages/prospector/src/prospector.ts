import { searchPlaces, getPlaceDetails, sleep, PlacesApiError } from '@platform/core/places';
import { scoreProspect } from './scorer.js';
import { upsertProspect } from './db.js';
import { SweepParams, Prospect } from './types.js';

const RATE_LIMIT_DELAY_MS = 2000;

interface SweepStats {
  processed: number;
  skipped: number;
  upserted: number;
  errors: number;
}

export async function runProspectorSweep(params: SweepParams): Promise<SweepStats> {
  const { city, category } = params;
  const query = `${category} in ${city}`;
  let pageToken: string | undefined;

  const stats: SweepStats = {
    processed: 0,
    skipped: 0,
    upserted: 0,
    errors: 0,
  };

  console.log(`Starting sweep for "${query}"...`);

  do {
    const searchResult = await searchPlaces(query, pageToken);

    for (const place of searchResult.places) {
      stats.processed++;

      try {
        const details = await getPlaceDetails(place.id);

        // Skip if the business has a website
        if (details.websiteUri) {
          console.log(`Skipping ${details.displayName.text} - has website`);
          stats.skipped++;
          continue;
        }

        const score = scoreProspect(details);

        const prospect: Prospect = {
          place_id: details.id,
          name: details.displayName.text,
          phone: details.nationalPhoneNumber,
          rating: details.rating,
          review_count: details.userRatingCount,
          photo_count: details.photos?.length ?? 0,
          score,
          status: 'new',
          source: 'maps',
          city,
          category,
        };

        await upsertProspect(prospect);
        stats.upserted++;
        console.log(`Upserted: ${prospect.name} (score: ${score})`);
      } catch (error) {
        stats.errors++;

        if (error instanceof PlacesApiError) {
          console.error(
            `[Places] Error fetching place ${place.id}: ${error.message} (status: ${error.status}, attempts: ${error.attempts})`
          );
        } else {
          console.error(`Error processing place ${place.id}:`, error);
        }
      }
    }

    pageToken = searchResult.nextPageToken;

    if (pageToken) {
      console.log('Waiting before next page...');
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  } while (pageToken);

  console.log(
    `[Sweep] ${city}/${category} complete: ${stats.processed} processed, ${stats.skipped} skipped, ${stats.upserted} upserted, ${stats.errors} errors`
  );

  return stats;
}
