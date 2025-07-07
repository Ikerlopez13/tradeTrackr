'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

// Cache simple y eficiente
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 segundos

// Hook de usuario optimizado
export const useOptimizedUserData = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true
    
    const getUser = async () => {
      try {
        // Verificar cache primero
        const cacheKey = 'user_data'
        const cached = cache.get(cacheKey)
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          if (isMounted) {
            setUser(cached.data)
            setLoading(false)
          }
          return
        }

        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Error obteniendo usuario:', error)
          if (isMounted) {
            setError(error.message)
            setLoading(false)
          }
          return
        }

        // Actualizar cache
        cache.set(cacheKey, { data: user, timestamp: Date.now() })
        
        if (isMounted) {
          setUser(user)
          setError(null)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error en getUser:', err)
        if (isMounted) {
          setError('Error de conexión')
          setLoading(false)
        }
      }
    }

    getUser()

    // Listener para cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null)
          cache.delete('user_data') // Limpiar cache en cambios
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, error }
}

// Hook de likes simplificado (mantenido para otros componentes)
export const useOptimizedLikes = () => {
  const [likes, setLikes] = useState<Record<string, { count: number; isLiked: boolean }>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const getLikes = useCallback(async (tradeId: string) => {
    if (loading[tradeId]) return

    try {
      setLoading(prev => ({ ...prev, [tradeId]: true }))
      
      const response = await fetch(`/api/likes?trade_id=${tradeId}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Error obteniendo likes')
      }
      
      const data = await response.json()
      
      setLikes(prev => ({
        ...prev,
        [tradeId]: {
          count: data.count || 0,
          isLiked: data.isLiked || false
        }
      }))
    } catch (error) {
      console.error('Error obteniendo likes:', error)
    } finally {
      setLoading(prev => ({ ...prev, [tradeId]: false }))
    }
  }, [loading])

  const toggleLike = useCallback(async (tradeId: string) => {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trade_id: tradeId })
      })
      
      if (!response.ok) {
        throw new Error('Error al dar like')
      }
      
      const data = await response.json()
      
      setLikes(prev => ({
        ...prev,
        [tradeId]: {
          count: data.count,
          isLiked: data.isLiked
        }
      }))
    } catch (error) {
      console.error('Error en toggleLike:', error)
    }
  }, [])

  return { likes, loading, getLikes, toggleLike }
}

// Función para limpiar cache
export const clearCache = () => {
  cache.clear()
} 