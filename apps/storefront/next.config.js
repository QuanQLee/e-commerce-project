/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    // Avoid CI failures from lint surprises during docker builds
    ignoreDuringBuilds: true,
  },
}
module.exports = nextConfig
