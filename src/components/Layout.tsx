'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import { useOptimizedUserData } from '@/hooks/useOptimizedData'
import { PreloadManager, ResourceHints, PerformanceMonitor } from './optimized/PreloadComponents'
import LoadingSpinner from './LoadingSpinner'

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
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading spinner ONLY while authenticating
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
        <LoadingSpinner 
          size={140} 
          className="text-white"
        />
      </div>
    )
  }

  // Don't render if no user
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen text-white layout-container" style={{backgroundColor: '#010314'}}>
      {/* Performance optimization components */}
      <PreloadManager />
      <ResourceHints />
      <PerformanceMonitor />
      
      {/* Sidebar for desktop */}
      <MemoizedSidebar {...sidebarProps} />
      
      {/* Main content */}
      <div className="md:ml-64 transition-all duration-300">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
      
      {/* Mobile navigation */}
      <MemoizedMobileNavigation {...mobileNavProps} />
    </div>
  )
} 