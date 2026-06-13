import { lookupFacebook } from '../listings/facebook.js';
import { lookupGoogleBusiness } from '../listings/google-business.js';
import { lookupYelp } from '../listings/yelp.js';
import type { Check, NapConsistencyRaw } from '../types.js';
import { normalizeUrl } from '../util/http.js';
import { compareListings, nameFromDomain } from '../util/nap.js';
import { runSafely, SkipCheck } from '../util/run-safely.js';

export const napConsistencyCheck: Check<NapConsistencyRaw> = {
  type: 'napConsistency',
  run: (target) =>
    runSafely('napConsistency', async () => {
      const hostname = new URL(normalizeUrl(target.url)).hostname;
      const domain = hostname.replace(/^www\./i, '');
      const businessName = target.name ?? nameFromDomain(hostname);
      if (!businessName) {
        throw new SkipCheck('business name unknown (pass --name; cannot derive one from an IP)');
      }

      const listings = await Promise.all([
        lookupGoogleBusiness(businessName, target.city, domain),
        lookupYelp(businessName, target.city, domain),
        lookupFacebook(businessName, target.city, domain),
      ]);

      if (listings.every((l) => l.unavailableReason)) {
        throw new SkipCheck(
          `no listing platform reachable: ${listings.map((l) => l.unavailableReason).join('; ')}`,
        );
      }

      const { comparedFields, mismatches } = compareListings(listings);
      return {
        businessName,
        listings,
        comparedFields,
        mismatches,
        foundCount: listings.filter((l) => l.found).length,
      };
    }),
};
