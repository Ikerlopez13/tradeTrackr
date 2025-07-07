'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import LoadingSpinner from './LoadingSpinner'

interface LayoutProps {
  children: React.ReactNode
}

// Memoizar componentes para evitar re-renders innecesarios
const MemoizedSidebar = React.memo(Sidebar)
const MemoizedMobileNavigation = React.memo(MobileNavigation)

export default function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true
    
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Auth error:', error)
          if (isMounted) {
            setLoading(false)
            setInitialLoad(false)
          }
          return
        }
        
        if (isMounted) {
          setUser(user)
        }
        
        if (user && isMounted) {
          await loadUserProfile(user.id)
        }
        
        if (isMounted) {
          setLoading(false)
          setInitialLoad(false)
        }
      } catch (err) {
        console.error('Error getting user:', err)
        if (isMounted) {
          setLoading(false)
          setInitialLoad(false)
        }
      }
    }

    const loadUserProfile = async (userId: string) => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (isMounted) {
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      }
    }

    getUser()

    // Optimizar listener de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            await loadUserProfile(session.user.id)
          } else {
            setProfile(null)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Memoizar props para evitar re-renders
  const sidebarProps = useMemo(() => ({
    user,
    profile
  }), [user, profile])

  const mobileNavProps = useMemo(() => ({
    user,
    profile
  }), [user, profile])

  if (initialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
        <LoadingSpinner size={100} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#010314'}}>
      <MemoizedSidebar {...sidebarProps} />
      <main className="md:ml-64 transition-all duration-300 pb-20 md:pb-0">
        {children}
      </main>
      <MemoizedMobileNavigation {...mobileNavProps} />
    </div>
  )
} 