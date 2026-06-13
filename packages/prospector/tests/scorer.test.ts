import { scoreProspect } from '../src/scorer.js';
import { PlaceDetails } from '@platform/core/types';

describe('scoreProspect', () => {
  const createPlace = (overrides: Partial<PlaceDetails> = {}): PlaceDetails => ({
    id: 'test-place-id',
    displayName: { text: 'Test Business' },
    ...overrides,
  });

  it('should return base score of 50 with minimal data', () => {
    const place = createPlace();
    expect(scoreProspect(place)).toBe(50);
  });

  it('should add 20 points for rating >= 4.0', () => {
    const place = createPlace({ rating: 4.0 });
    expect(scoreProspect(place)).toBe(70);
  });

  it('should not add points for rating < 4.0', () => {
    const place = createPlace({ rating: 3.9 });
    expect(scoreProspect(place)).toBe(50);
  });

  it('should add 15 points for userRatingCount >= 10', () => {
    const place = createPlace({ userRatingCount: 10 });
    expect(scoreProspect(place)).toBe(65);
  });

  it('should add 25 points for userRatingCount >= 50 (15 + 10)', () => {
    const place = createPlace({ userRatingCount: 50 });
    expect(scoreProspect(place)).toBe(75);
  });

  it('should add 5 points for more than 3 photos', () => {
    const place = createPlace({
      photos: [{ name: '1' }, { name: '2' }, { name: '3' }, { name: '4' }],
    });
    expect(scoreProspect(place)).toBe(55);
  });

  it('should not add points for 3 or fewer photos', () => {
    const place = createPlace({
      photos: [{ name: '1' }, { name: '2' }, { name: '3' }],
    });
    expect(scoreProspect(place)).toBe(50);
  });

  it('should cap score at 100', () => {
    const place = createPlace({
      rating: 5.0,
      userRatingCount: 100,
      photos: [{ name: '1' }, { name: '2' }, { name: '3' }, { name: '4' }, { name: '5' }],
    });
    // 50 + 20 + 25 + 5 = 100
    expect(scoreProspect(place)).toBe(100);
  });

  it('should handle all scoring factors combined', () => {
    const place = createPlace({
      rating: 4.5,
      userRatingCount: 25,
      photos: [{ name: '1' }, { name: '2' }, { name: '3' }, { name: '4' }],
    });
    // 50 + 20 (rating) + 15 (reviews >= 10) + 5 (photos > 3) = 90
    expect(scoreProspect(place)).toBe(90);
  });
});
