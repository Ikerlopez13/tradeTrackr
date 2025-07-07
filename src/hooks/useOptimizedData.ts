import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// Cache para evitar consultas duplicadas
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Función para obtener datos del cache
const getCachedData = (key: string) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

// Función para guardar datos en cache
const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() })
}

// Hook optimizado para datos del usuario
export const useOptimizedUserData = () => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar cache primero
      const cacheKey = 'user-data'
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        setUser(cachedData.user)
        setProfile(cachedData.profile)
        setLoading(false)
        return
      }

      // Cargar datos del usuario en paralelo
      const [userResult, profileResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getUser().then(({ data: { user } }) => 
          user ? supabase.from('profiles').select('*').eq('id', user.id).single() : null
        )
      ])

      if (userResult.error) {
        throw userResult.error
      }

      const userData = userResult.data.user
      const profileData = profileResult?.data || null

      // Guardar en cache
      setCachedData(cacheKey, { user: userData, profile: profileData })

      setUser(userData)
      setProfile(profileData)
    } catch (err: any) {
      setError(err.message || 'Error cargando datos del usuario')
      console.error('Error loading user data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadUserData()

    // Listener optimizado para cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          cache.clear() // Limpiar cache al cerrar sesión
        } else if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadUserData, supabase])

  return { user, profile, loading, error, refetch: loadUserData }
}

// Hook optimizado para estadísticas del dashboard
export const useOptimizedDashboardStats = (userId?: string) => {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const loadStats = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const cacheKey = `dashboard-stats-${userId}`
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        setStats(cachedData)
        setLoading(false)
        return
      }

      // Cargar todos los datos en paralelo
      const [profileResult, tradesResult, statsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
        supabase.from('user_stats').select('*').eq('user_id', userId).single()
      ])

      const combinedStats = {
        profile: profileResult.data,
        recentTrades: tradesResult.data || [],
        userStats: statsResult.data || {}
      }

      // Guardar en cache
      setCachedData(cacheKey, combinedStats)
      setStats(combinedStats)
    } catch (err: any) {
      setError(err.message || 'Error cargando estadísticas')
      console.error('Error loading dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return { stats, loading, error, refetch: loadStats }
}

// Hook optimizado para el feed
export const useOptimizedFeed = (page = 1, limit = 20) => {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  
  const supabase = createClient()

  const loadFeed = useCallback(async (pageNum = 1, pageLimit = 20) => {
    try {
      setLoading(true)
      setError(null)

      const cacheKey = `feed-${pageNum}-${pageLimit}`
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        setTrades(cachedData.trades)
        setHasMore(cachedData.hasMore)
        setLoading(false)
        return
      }

      // Llamar a la API optimizada del feed
      const response = await fetch(`/api/feed?page=${pageNum}&limit=${pageLimit}`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Guardar en cache
      setCachedData(cacheKey, {
        trades: data.trades,
        hasMore: data.pagination.hasMore
      })

      setTrades(data.trades)
      setHasMore(data.pagination.hasMore)
    } catch (err: any) {
      setError(err.message || 'Error cargando feed')
      console.error('Error loading feed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeed(page, limit)
  }, [loadFeed, page, limit])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadFeed(page + 1, limit)
    }
  }, [loading, hasMore, page, limit, loadFeed])

  return { trades, loading, error, hasMore, refetch: () => loadFeed(page, limit), loadMore }
}

// Hook para limpiar cache manualmente
export const useCacheManager = () => {
  const clearCache = useCallback(() => {
    cache.clear()
  }, [])

  const clearCacheByPattern = useCallback((pattern: string) => {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    }
  }, [])

  return { clearCache, clearCacheByPattern }
} 