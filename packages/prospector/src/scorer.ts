import { PlaceDetails } from '@platform/core/types';

export function scoreProspect(place: PlaceDetails): number {
  let score = 50;

  if (place.rating !== undefined && place.rating >= 4.0) {
    score += 20;
  }

  if (place.userRatingCount !== undefined) {
    if (place.userRatingCount >= 50) {
      score += 25; // +15 for >=10 and +10 for >=50
    } else if (place.userRatingCount >= 10) {
      score += 15;
    }
  }

  if (place.photos && place.photos.length > 3) {
    score += 5;
  }

  return Math.min(score, 100);
}
