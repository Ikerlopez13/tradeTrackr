'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import { useOptimizedUserData } from '@/hooks/useOptimizedData'
import { PreloadManager, ResourceHints, PerformanceMonitor } from './optimized/PreloadComponents'

// Memoized components
const MemoizedSidebar = React.memo(Sidebar)
const MemoizedMobileNavigation = React.memo(MobileNavigation)

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, profile, loading } = useOptimizedUserData()
  const router = useRouter()

  // Memoized props to prevent unnecessary re-renders
  const sidebarProps = useMemo(() => ({
    user,
    profile,
    isMobileMenuOpen,
    setIsMobileMenuOpen
  }), [user, profile, isMobileMenuOpen])

  const mobileNavProps = useMemo(() => ({
    user,
    profile,
    isMobileMenuOpen,
    setIsMobileMenuOpen
  }), [user, profile, isMobileMenuOpen])

  // Handle authentication redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Don't render anything while loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Don't render if no user
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white layout-container">
      {/* Performance optimization components */}
      <PreloadManager />
      <ResourceHints />
      <PerformanceMonitor />
      
      {/* Sidebar for desktop */}
      <MemoizedSidebar {...sidebarProps} />
      
      {/* Mobile Navigation */}
      <MemoizedMobileNavigation {...mobileNavProps} />
      
      {/* Main content */}
      <main className="lg:ml-64 min-h-screen content-container">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
      
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  )
} 