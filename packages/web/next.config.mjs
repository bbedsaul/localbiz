/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The instant-scan route imports sitevitals-engine (which uses node:tls and
  // cheerio). Keep them external so Next doesn't bundle Node-only code.
  // (Next 14 key; becomes top-level `serverExternalPackages` in Next 15.)
  experimental: {
    serverComponentsExternalPackages: ['sitevitals-engine', 'cheerio'],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
