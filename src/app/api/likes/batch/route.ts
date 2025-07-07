import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Obtener likes de múltiples trades de una vez
export async function POST(request: NextRequest) {
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

    const { trade_ids } = await request.json()

    if (!trade_ids || !Array.isArray(trade_ids) || trade_ids.length === 0) {
      return NextResponse.json(
        { error: 'trade_ids es requerido y debe ser un array' },
        { status: 400 }
      )
    }

    // Limitar a máximo 50 trades por batch para evitar sobrecarga
    if (trade_ids.length > 50) {
      return NextResponse.json(
        { error: 'Máximo 50 trades por batch' },
        { status: 400 }
      )
    }

    // Obtener todos los likes de los trades especificados
    const { data: likes, error: likesError } = await supabase
      .from('trade_likes')
      .select('trade_id, user_id')
      .in('trade_id', trade_ids)

    if (likesError) {
      console.error('Error fetching likes:', likesError)
      return NextResponse.json(
        { error: 'Error al obtener likes' },
        { status: 500 }
      )
    }

    // Procesar los likes por trade
    const likesData: { [tradeId: string]: { count: number; isLiked: boolean } } = {}
    
    // Inicializar todos los trades con 0 likes
    trade_ids.forEach(tradeId => {
      likesData[tradeId] = { count: 0, isLiked: false }
    })

    // Contar likes y verificar si el usuario actual ya dio like
    likes?.forEach(like => {
      if (!likesData[like.trade_id]) {
        likesData[like.trade_id] = { count: 0, isLiked: false }
      }
      
      likesData[like.trade_id].count++
      
      if (like.user_id === user.id) {
        likesData[like.trade_id].isLiked = true
      }
    })

    return NextResponse.json({
      likes: likesData
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 