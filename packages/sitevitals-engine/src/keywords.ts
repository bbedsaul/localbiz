/**
 * Curated category → common service phrases for local-keyword suggestions.
 * Keys are matched as substrings of the user-supplied category (lowercased),
 * so "HVAC contractor" and "hvac" both hit the hvac entry. Extend freely.
 */
const CATEGORY_SERVICES: Record<string, string[]> = {
  hvac: ['hvac repair', 'ac repair', 'ac installation', 'furnace repair', 'hvac company'],
  plumb: ['plumber', 'emergency plumber', 'drain cleaning', 'water heater repair', 'plumbing repair'],
  electric: ['electrician', 'electrical repair', 'panel upgrade', 'ev charger installation', 'emergency electrician'],
  dent: ['dentist', 'teeth cleaning', 'emergency dentist', 'dental implants', 'teeth whitening'],
  salon: ['hair salon', 'haircut', 'hair color', 'balayage', 'best hair salon'],
  barber: ['barber shop', 'mens haircut', 'beard trim', 'fade haircut', 'barber near me'],
  landscap: ['landscaping', 'lawn care', 'lawn mowing service', 'tree trimming', 'landscape design'],
  roof: ['roofing company', 'roof repair', 'roof replacement', 'roof inspection', 'storm damage repair'],
  auto: ['auto repair', 'oil change', 'brake repair', 'car ac repair', 'mechanic'],
  restaurant: ['restaurant', 'best restaurant', 'lunch spots', 'dinner reservations', 'takeout'],
  lawyer: ['lawyer', 'personal injury lawyer', 'family lawyer', 'criminal defense attorney', 'estate planning attorney'],
  account: ['accountant', 'tax preparation', 'bookkeeping services', 'cpa', 'small business accountant'],
  chiroprac: ['chiropractor', 'back pain relief', 'neck pain treatment', 'spinal adjustment', 'sports chiropractor'],
  vet: ['veterinarian', 'animal hospital', 'pet vaccinations', 'emergency vet', 'spay and neuter'],
  pest: ['pest control', 'exterminator', 'termite treatment', 'rodent control', 'bed bug treatment'],
  clean: ['house cleaning', 'maid service', 'deep cleaning service', 'move out cleaning', 'office cleaning'],
  gym: ['gym', 'personal trainer', 'fitness classes', 'crossfit', '24 hour gym'],
  'real estate': ['real estate agent', 'realtor', 'homes for sale', 'sell my house', 'property management'],
  photograph: ['photographer', 'wedding photographer', 'family photographer', 'headshots', 'newborn photographer'],
  daycare: ['daycare', 'childcare', 'preschool', 'infant daycare', 'after school care'],
};

/** "Austin, TX" → "austin"; keeps multi-word city names intact. */
function normalizeCity(city: string): string {
  return city.split(',')[0]?.trim().toLowerCase() ?? city.trim().toLowerCase();
}

/**
 * Suggest local-search keywords for a category + city. Falls back to generic
 * patterns for categories outside the curated map.
 */
export function suggestKeywords(category: string, city: string, count = 5): string[] {
  const cat = category.trim().toLowerCase();
  const loc = normalizeCity(city);

  const entry = Object.entries(CATEGORY_SERVICES).find(([key]) => cat.includes(key));
  const services = entry?.[1] ?? [cat, `best ${cat}`, `${cat} near me`, `${cat} services`, `local ${cat}`];

  return services.slice(0, count).map((service) =>
    // "x near me" reads badly with a city bolted on; leave it as-is.
    service.endsWith('near me') ? service : `${service} ${loc}`,
  );
}
