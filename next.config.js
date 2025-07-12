/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  // Prevent build failures when DATABASE_URL is not available at build time
  output: 'standalone',
  // Skip type checking and linting during build (we'll do it in CI separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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