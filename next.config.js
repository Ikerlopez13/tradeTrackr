/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración de imágenes
  images: {
    domains: ['localhost', '127.0.0.1', 'lpovvlzcbouojapcriwg.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lpovvlzcbouojapcriwg.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**'
      }
    ],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Configuración experimental
  experimental: {
    optimizeCss: true,
    webpackBuildWorker: true,
  },

  // Configuración de webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Configuración de output
  output: 'standalone',
  
  // Configuración de optimización
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig 