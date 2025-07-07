'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Preload critical routes
const criticalRoutes = [
  '/feed',
  '/dashboard',
  '/trades',
  '/api/feed?page=1&limit=20'
]

// Preload component
export const PreloadManager = () => {
  const router = useRouter()

  useEffect(() => {
    // Preload critical routes
    criticalRoutes.forEach(route => {
      if (route.startsWith('/api/')) {
        // Preload API routes
        fetch(route).catch(() => {
          // Silently fail - this is just preloading
        })
      } else {
        // Preload Next.js routes
        router.prefetch(route)
      }
    })

    // Preload critical images
    const preloadImages = [
      '/logo.png',
      '/default-avatar.png'
    ]

    preloadImages.forEach(src => {
      const img = new Image()
      img.src = src
    })

    // Preload critical fonts
    const preloadFonts = [
      '/fonts/inter-var.woff2'
    ]

    preloadFonts.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = 'font/woff2'
      link.crossOrigin = 'anonymous'
      link.href = href
      document.head.appendChild(link)
    })

  }, [router])

  return null
}

// Resource hints component
export const ResourceHints = () => {
  useEffect(() => {
    // DNS prefetch for external resources
    const dnsPrefetch = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ]

    dnsPrefetch.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = href
      document.head.appendChild(link)
    })

    // Preconnect to critical origins
    const preconnect = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ]

    preconnect.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = href
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })

  }, [])

  return null
}

// Performance observer for monitoring
export const PerformanceMonitor = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        
        // Log performance metrics in development
        if (process.env.NODE_ENV === 'development') {
          console.log('LCP:', lastEntry.startTime)
        }
      })

      // Monitor First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          // Type assertion for first-input entries
          const firstInputEntry = entry as any
          if (process.env.NODE_ENV === 'development' && firstInputEntry.processingStart) {
            console.log('FID:', firstInputEntry.processingStart - entry.startTime)
          }
        })
      })

      // Monitor Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          // Type assertion for layout-shift entries
          const layoutShiftEntry = entry as any
          if (process.env.NODE_ENV === 'development' && !layoutShiftEntry.hadRecentInput && layoutShiftEntry.value) {
            console.log('CLS:', layoutShiftEntry.value)
          }
        })
      })

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        fidObserver.observe({ entryTypes: ['first-input'] })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
      } catch (error) {
        // Silently fail if performance observers are not supported
      }

      return () => {
        lcpObserver.disconnect()
        fidObserver.disconnect()
        clsObserver.disconnect()
      }
    }
  }, [])

  return null
} 