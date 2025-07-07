import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cache de respuestas para mejorar rendimiento
const responseCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutos

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Máximo 50 por página
  const offset = (page - 1) * limit

  try {
    // Verificar cache primero
    const cacheKey = `feed-${page}-${limit}`
    const cached = responseCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=120',
          'CDN-Cache-Control': 'public, max-age=120'
        }
      })
    }

    const supabase = await createClient()

    // Obtener usuario actual para likes
    const { data: { user } } = await supabase.auth.getUser()

    // OPTIMIZACIÓN: Una sola consulta con JOIN para obtener todo
    const { data: tradesData, error } = await supabase
      .from('trades')
      .select(`
        id,
        title,
        pair,
        timeframe,
        bias,
        result,
        risk_reward,
        pnl_percentage,
        pnl_pips,
        pnl_money,
        screenshot_url,
        created_at,
        user_id,
        description,
        confluences,
        session,
        feeling,
        profiles!inner(
          username,
          avatar_url,
          is_premium
        ),
        user_stats!inner(
          wins,
          losses,
          win_rate,
          total_pnl_percentage
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching trades:', error)
      throw new Error('Error al obtener trades')
    }

    const trades = tradesData || []

    // OPTIMIZACIÓN: Obtener likes en paralelo solo si hay trades
    let userLikesMap = new Map()
    let likesCountsMap = new Map()

    if (trades.length > 0) {
      const tradeIds = trades.map((t: any) => t.id)
      
      const [userLikesResult, likesCountsResult] = await Promise.all([
        // Likes del usuario actual
        user ? supabase
          .from('trade_likes')
          .select('trade_id')
          .eq('user_id', user.id)
          .in('trade_id', tradeIds) : Promise.resolve({ data: [] }),
        
        // Contar likes por trade con una sola consulta
        supabase
          .from('trade_likes')
          .select('trade_id')
          .in('trade_id', tradeIds)
      ])

      // Procesar likes del usuario
      userLikesResult.data?.forEach((like: any) => {
        userLikesMap.set(like.trade_id, true)
      })

      // Procesar conteos de likes
      likesCountsResult.data?.forEach((like: any) => {
        const currentCount = likesCountsMap.get(like.trade_id) || 0
        likesCountsMap.set(like.trade_id, currentCount + 1)
      })
    }

    // Combinar datos de manera eficiente
    const enrichedTrades = trades.map((trade: any) => {
      const profile = trade.profiles
      const stats = trade.user_stats
      const likesCount = likesCountsMap.get(trade.id) || 0
      const userLiked = userLikesMap.has(trade.id)

      return {
        id: trade.id,
        title: trade.title,
        pair: trade.pair,
        timeframe: trade.timeframe,
        bias: trade.bias,
        result: trade.result,
        risk_reward: trade.risk_reward,
        pnl_percentage: trade.pnl_percentage,
        pnl_pips: trade.pnl_pips,
        pnl_money: trade.pnl_money,
        screenshot_url: trade.screenshot_url,
        created_at: trade.created_at,
        user_id: trade.user_id,
        description: trade.description,
        confluences: trade.confluences,
        session: trade.session,
        feeling: trade.feeling,
        username: profile?.username || 'Usuario',
        avatar_url: profile?.avatar_url || null,
        is_premium: profile?.is_premium || false,
        wins: stats?.wins || 0,
        losses: stats?.losses || 0,
        win_rate: stats?.win_rate || 0,
        total_pnl_percentage: stats?.total_pnl_percentage || 0,
        likes_count: likesCount,
        user_liked: userLiked
      }
    })

    const responseData = {
      trades: enrichedTrades,
      pagination: {
        page,
        limit,
        total: trades.length,
        hasMore: trades.length === limit
      }
    }

    // Guardar en cache
    responseCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    })

    // Limpiar cache viejo cada 100 requests
    if (responseCache.size > 100) {
      const now = Date.now()
      for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          responseCache.delete(key)
        }
      }
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=120, s-maxage=120',
        'CDN-Cache-Control': 'public, max-age=120'
      }
    })

  } catch (error) {
    console.error('Error in feed API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 