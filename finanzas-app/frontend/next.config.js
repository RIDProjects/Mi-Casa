/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1' },
  // The module guide is bundled as a string and rendered through iframe
  // srcDoc: a static public/guia.html returned 404 on Vercel, which made the
  // iframe load the app's 404 page (the app nested inside itself).
  webpack: (config) => {
    config.module.rules.push({ test: /\.html$/, type: 'asset/source' });
    return config;
  },
};
module.exports = nextConfig;
