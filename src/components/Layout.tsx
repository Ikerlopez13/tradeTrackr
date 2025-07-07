'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOptimizedUserData } from '@/hooks/useOptimizedData'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import LoadingSpinner from './LoadingSpinner'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading, error } = useOptimizedUserData()
  const router = useRouter()

  // Redirección INMEDIATA si no hay usuario
  useEffect(() => {
    if (!loading && !user) {
      console.log('🚨 No hay usuario en Layout, redirigiendo a login')
      router.push('/login')
      return
    }
  }, [user, loading, router])

  // Si está cargando, mostrar spinner
  if (loading) {
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
        profile={null}
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
        profile={null}
      />
    </div>
  )
} 