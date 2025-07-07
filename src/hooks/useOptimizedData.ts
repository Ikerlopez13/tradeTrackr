'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Cache en memoria para evitar requests duplicados
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export const useOptimizedUserData = () => {
  const [userData, setUserData] = useState<{
    user: any;
    profile: any;
    loading: boolean;
    error: string | null;
  }>({
    user: null,
    profile: null,
    loading: true,
    error: null
  })

  const supabase = createClient()

  const loadUserData = useCallback(async () => {
    try {
      // Obtener usuario directamente sin cache complejo
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Auth error:', userError)
        setUserData({
          user: null,
          profile: null,
          loading: false,
          error: userError.message
        })
        return
      }

      if (!user) {
        setUserData({
          user: null,
          profile: null,
          loading: false,
          error: null
        })
        return
      }

      // Obtener perfil en paralelo (no bloquear la UI)
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Establecer usuario inmediatamente
      setUserData({
        user,
        profile: null,
        loading: false,
        error: null
      })

      // Cargar perfil en segundo plano
      try {
        const { data: profile, error: profileError } = await profilePromise
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile error:', profileError)
        }

        setUserData(prev => ({
          ...prev,
          profile
        }))
      } catch (profileErr) {
        console.error('Error loading profile:', profileErr)
      }

    } catch (error) {
      console.error('Error loading user data:', error)
      setUserData({
        user: null,
        profile: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }, [supabase])

  useEffect(() => {
    loadUserData()

    // Listener para cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          await loadUserData()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [loadUserData])

  return userData
}

// Hook optimizado para el feed
export const useOptimizedFeed = (page = 1, limit = 20) => {
  const [feedData, setFeedData] = useState<{
    trades: any[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
  }>({
    trades: [],
    loading: true,
    error: null,
    hasMore: true
  })

  const supabase = createClient()

  const loadFeed = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      const cacheKey = `feed-${pageNum}-${limit}`
      const cached = cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        if (append) {
          setFeedData(prev => ({
            ...prev,
            trades: [...prev.trades, ...cached.data.trades],
            loading: false,
            hasMore: cached.data.hasMore
          }))
        } else {
          setFeedData({
            trades: cached.data.trades,
            loading: false,
            error: null,
            hasMore: cached.data.hasMore
          })
        }
        return
      }

      if (!append) {
        setFeedData(prev => ({ ...prev, loading: true, error: null }))
      }

      const response = await fetch(`/api/feed?page=${pageNum}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar el feed')
      }

      const data = await response.json()
      
      // Guardar en cache
      cache.set(cacheKey, {
        data: {
          trades: data.trades || [],
          hasMore: data.hasMore || false
        },
        timestamp: Date.now()
      })

      if (append) {
        setFeedData(prev => ({
          ...prev,
          trades: [...prev.trades, ...data.trades],
          loading: false,
          hasMore: data.hasMore
        }))
      } else {
        setFeedData({
          trades: data.trades || [],
          loading: false,
          error: null,
          hasMore: data.hasMore || false
        })
      }

    } catch (error) {
      console.error('Error loading feed:', error)
      setFeedData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }))
    }
  }, [limit, supabase])

  const loadMore = useCallback(() => {
    if (!feedData.loading && feedData.hasMore) {
      loadFeed(Math.floor(feedData.trades.length / limit) + 1, true)
    }
  }, [feedData.loading, feedData.hasMore, feedData.trades.length, limit, loadFeed])

  const refetch = useCallback(() => {
    // Limpiar cache
    for (const key of cache.keys()) {
      if (key.startsWith('feed-')) {
        cache.delete(key)
      }
    }
    loadFeed(1, false)
  }, [loadFeed])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  return {
    ...feedData,
    loadMore,
    refetch
  }
}

// Hook para likes optimizado
export const useOptimizedLikes = () => {
  const [likes, setLikes] = useState<Map<string, boolean>>(new Map())
  const [loadingLike, setLoadingLike] = useState<string | null>(null)

  const supabase = createClient()

  const toggleLike = useCallback(async (tradeId: string) => {
    try {
      setLoadingLike(tradeId)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const isLiked = likes.get(tradeId) || false
      
      if (isLiked) {
        // Remover like
        await supabase
          .from('trade_likes')
          .delete()
          .eq('trade_id', tradeId)
          .eq('user_id', user.id)
      } else {
        // Agregar like
        await supabase
          .from('trade_likes')
          .insert({ trade_id: tradeId, user_id: user.id })
      }

      // Actualizar estado local inmediatamente
      setLikes(prev => new Map(prev).set(tradeId, !isLiked))
      
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setLoadingLike(null)
    }
  }, [likes, supabase])

  return {
    likes,
    loadingLike,
    toggleLike,
    setLikes
  }
}

// Función para limpiar cache
export const clearCache = () => {
  cache.clear()
} 