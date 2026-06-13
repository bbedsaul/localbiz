/** Business categories for onboarding — aligned with the engine's keyword map. */
export const CATEGORIES = [
  'HVAC',
  'Plumbing',
  'Electrician',
  'Dentist',
  'Hair Salon',
  'Barber Shop',
  'Landscaping',
  'Roofing',
  'Auto Repair',
  'Restaurant',
  'Lawyer',
  'Accountant',
  'Chiropractor',
  'Veterinarian',
  'Pest Control',
  'House Cleaning',
  'Gym / Fitness',
  'Real Estate',
  'Photographer',
  'Daycare',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  uptime: 'Uptime & availability',
  performance: 'Performance',
  mobile: 'Mobile friendliness',
  localSearch: 'Local search visibility',
  listings: 'Listing consistency',
  hygiene: 'Content & technical hygiene',
  security: 'Security & trust',
};
