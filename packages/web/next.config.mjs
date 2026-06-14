/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The instant-scan route imports sitevitals-engine (which uses node:tls and
  // cheerio). Keep them external so Next doesn't bundle Node-only code — they're
  // resolved at runtime from node_modules (the Docker image ships a flattened
  // node_modules via `pnpm deploy --prod`, so the engine is present).
  experimental: {
    serverComponentsExternalPackages: ['sitevitals-engine', 'cheerio'],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
