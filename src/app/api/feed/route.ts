import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Obtener trades públicos para el feed
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Obtener trades públicos con conteo de likes optimizado
    const { data: trades, error } = await supabase
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
        profiles!inner (
          username,
          avatar_url,
          is_premium
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching trades:', error)
      return NextResponse.json(
        { error: 'Error al obtener trades' },
        { status: 500 }
      )
    }

    if (!trades || trades.length === 0) {
      return NextResponse.json({
        trades: [],
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasMore: false
        }
      })
    }

    // Obtener estadísticas de usuarios y likes en paralelo
    const tradeIds = trades.map(trade => trade.id)
    const profilesData = trades.map(trade => trade.profiles).filter(Boolean)
    const userIds = [...new Set(profilesData.map((profile: any) => profile.username).filter(Boolean))]
    
    const [likesResult, statsResult] = await Promise.all([
      // Obtener likes de todos los trades de una vez
      supabase
        .from('trade_likes')
        .select('trade_id, user_id')
        .in('trade_id', tradeIds),
      
      // Obtener estadísticas de usuarios
      supabase
        .from('user_stats')
        .select('user_id, wins, losses, win_rate, total_pnl_percentage')
        .in('user_id', userIds)
    ])

    // Procesar likes
    const likesData: { [tradeId: string]: { count: number; userLiked: boolean } } = {}
    tradeIds.forEach(tradeId => {
      likesData[tradeId] = { count: 0, userLiked: false }
    })

    if (likesResult.data) {
      likesResult.data.forEach(like => {
        if (likesData[like.trade_id]) {
          likesData[like.trade_id].count++
          if (like.user_id === user.id) {
            likesData[like.trade_id].userLiked = true
          }
        }
      })
    }

    // Procesar estadísticas de usuarios
    const userStats: { [userId: string]: any } = {}
    if (statsResult.data) {
      statsResult.data.forEach(stat => {
        userStats[stat.user_id] = stat
      })
    }

    // Formatear los datos para el frontend
    const formattedTrades = trades.map((trade: any) => {
      const profile = trade.profiles
      const likes = likesData[trade.id] || { count: 0, userLiked: false }
      const stats = userStats[profile?.username] || {}
      
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
        description: null,
        confluences: null,
        session: null,
        feeling: null,
        username: profile?.username || 'Usuario',
        avatar_url: profile?.avatar_url,
        is_premium: profile?.is_premium || false,
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        win_rate: stats.win_rate || 0,
        total_pnl_percentage: stats.total_pnl_percentage || 0,
        likes_count: likes.count,
        user_liked: likes.userLiked
      }
    })

    // Obtener el conteo total para paginación
    const { count: totalCount, error: countError } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)

    if (countError) {
      console.error('Error counting trades:', countError)
    }

    const totalPages = Math.ceil((totalCount || 0) / limit)
    const hasMore = page < totalPages

    return NextResponse.json({
      trades: formattedTrades,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 