/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  // Prevent build failures when DATABASE_URL is not available at build time
  output: 'standalone',
  // Ensure dynamic imports work properly
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client side
      config.resolve.fallback = { fs: false, net: false, tls: false }
    }
    return config
  },
}

module.exports = nextConfig