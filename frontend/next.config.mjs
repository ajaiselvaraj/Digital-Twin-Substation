/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Fix source map issues - disable production source maps
  productionBrowserSourceMaps: false,
  // Webpack configuration to disable source maps in development
  // This will be used when running with --webpack flag
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable source maps in development to avoid parsing errors
      config.devtool = false
    }
    return config
  },
  // Empty turbopack config to silence the warning
  // When using --webpack flag, webpack config will be used instead
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
