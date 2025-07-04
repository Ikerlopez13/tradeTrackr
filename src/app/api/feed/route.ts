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

    // Obtener trades públicos usando la vista actualizada
    const { data: trades, error } = await supabase
      .from('public_trades_feed')
      .select('*')
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching public trades:', error)
      return NextResponse.json(
        { error: 'Error al obtener trades' },
        { status: 500 }
      )
    }

    // Para cada trade, verificar si el usuario actual ha dado like
    const tradesWithUserLikes = await Promise.all(
      (trades || []).map(async (trade) => {
        const { data: userLike, error: likeError } = await supabase
          .from('trade_likes')
          .select('id')
          .eq('trade_id', trade.id)
          .eq('user_id', user.id)
          .single()

        return {
          ...trade,
          user_has_liked: !!userLike && !likeError
        }
      })
    )

    // Obtener el conteo total para paginación
    const { count: totalCount, error: countError } = await supabase
      .from('public_trades_feed')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error counting trades:', countError)
    }

    const totalPages = Math.ceil((totalCount || 0) / limit)

    return NextResponse.json({
      trades: tradesWithUserLikes,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasMore: page < totalPages
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