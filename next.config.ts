/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ⚠️ Allow production builds to succeed even if there are TS errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ Skip ESLint during builds
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
