import type { MetadataRoute } from 'next';

const BASE = 'https://localmarketz.com';

// Public marketing routes. Stage B adds /pricing and the remaining service pages.
const ROUTES = ['', '/services/websites', '/services/sitevitals', '/about', '/privacy', '/terms'];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.6,
  }));
}
