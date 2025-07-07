/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental optimizations
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'react-hook-form',
      'zod'
    ]
  },

  // Server external packages
  serverExternalPackages: ['@supabase/supabase-js'],

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src')
    }

    // Fix self is not defined error
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false
      }
    }

    // Production optimizations
    if (!dev) {
      // Tree shaking optimization
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false
      }
    }

    return config
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },

  // Compress responses
  compress: true,

  // Power optimizations
  poweredByHeader: false,

  // Static optimization
  trailingSlash: false,

  // Performance optimizations
  reactStrictMode: true,

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // Headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60'
          }
        ]
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 