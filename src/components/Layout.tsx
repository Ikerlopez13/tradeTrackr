'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOptimizedUserData } from '@/hooks/useOptimizedData'
import { createClient } from '@/lib/supabase/client'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import LoadingSpinner from './LoadingSpinner'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading, error } = useOptimizedUserData()
  const [profile, setProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Cargar datos del perfil cuando el usuario esté disponible
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfile(null)
        setProfileLoading(false)
        return
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error cargando perfil:', profileError)
        } else {
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Error en loadProfile:', err)
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [user, supabase])

  // Redirección INMEDIATA si no hay usuario
  useEffect(() => {
    if (!loading && !user) {
      console.log('🚨 No hay usuario en Layout, redirigiendo a login')
      router.push('/login')
      return
    }
  }, [user, loading, router])

  // Si está cargando, mostrar spinner
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
        <LoadingSpinner size={60} className="text-white" />
      </div>
    )
  }

  // Si hay error, redirigir a login
  if (error) {
    console.log('🚨 Error en Layout, redirigiendo a login')
    router.push('/login')
    return null
  }

  // Si no hay usuario, no renderizar nada (ya se redirigió)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen text-white layout-container" style={{backgroundColor: '#010314'}}>
      {/* Sidebar para desktop */}
      <Sidebar 
        user={user}
        profile={profile}
      />
      
      {/* Contenido principal */}
      <div className="md:ml-64 transition-all duration-300">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
      
      {/* Navegación móvil */}
      <MobileNavigation 
        user={user}
        profile={profile}
      />
    </div>
  )
} 