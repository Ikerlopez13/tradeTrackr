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

    // Usar la vista public_trades_feed como estaba originalmente
    const { data: trades, error } = await supabase
      .from('public_trades_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching trades:', error)
      return NextResponse.json(
        { error: 'Error al obtener trades' },
        { status: 500 }
      )
    }

    // Formatear los datos para el frontend
    const formattedTrades = (trades || []).map((trade: any) => ({
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
      description: null, // La vista original no incluía description
      confluences: null, // La vista original no incluía confluences
      session: null, // La vista original no incluía session
      feeling: null, // La vista original no incluía feeling
      username: trade.username,
      avatar_url: trade.avatar_url,
      wins: trade.wins || 0,
      losses: trade.losses || 0,
      win_rate: trade.win_rate || 0,
      total_pnl_percentage: trade.total_pnl_percentage || 0
    }))

    // Obtener el conteo total para paginación
    const { count: totalCount, error: countError } = await supabase
      .from('public_trades_feed')
      .select('*', { count: 'exact', head: true })

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