import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/api/', '/signup'] },
    sitemap: 'https://localmarketz.com/sitemap.xml',
    host: 'https://localmarketz.com',
  };
}
