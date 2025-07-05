import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Obtener likes de un trade específico
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
    const tradeId = searchParams.get('trade_id')

    if (!tradeId) {
      return NextResponse.json(
        { error: 'trade_id es requerido' },
        { status: 400 }
      )
    }

    // Obtener todos los likes del trade
    const { data: likes, error: likesError } = await supabase
      .from('trade_likes')
      .select('user_id')
      .eq('trade_id', tradeId)

    if (likesError) {
      console.error('Error fetching likes:', likesError)
      return NextResponse.json(
        { error: 'Error al obtener likes' },
        { status: 500 }
      )
    }

    // Contar likes y verificar si el usuario actual ya dio like
    const count = likes?.length || 0
    const isLiked = likes?.some(like => like.user_id === user.id) || false

    return NextResponse.json({
      count,
      isLiked
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Dar like a un trade
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

    const { trade_id } = await request.json()

    if (!trade_id) {
      return NextResponse.json(
        { error: 'trade_id es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el trade existe y es público
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('id, is_public')
      .eq('id', trade_id)
      .single()

    if (tradeError || !trade || !trade.is_public) {
      return NextResponse.json(
        { error: 'Trade no encontrado o no es público' },
        { status: 404 }
      )
    }

    // Insertar like
    const { data, error } = await supabase
      .from('trade_likes')
      .insert({
        trade_id: trade_id,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Ya has dado like a este trade' },
          { status: 409 }
        )
      }
      console.error('Error inserting like:', error)
      return NextResponse.json(
        { error: 'Error al dar like' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Like agregado exitosamente',
      like: data
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Quitar like de un trade
export async function DELETE(request: NextRequest) {
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

    const { trade_id } = await request.json()

    if (!trade_id) {
      return NextResponse.json(
        { error: 'trade_id es requerido' },
        { status: 400 }
      )
    }

    // Eliminar like
    const { error } = await supabase
      .from('trade_likes')
      .delete()
      .eq('trade_id', trade_id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting like:', error)
      return NextResponse.json(
        { error: 'Error al quitar like' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Like eliminado exitosamente'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 