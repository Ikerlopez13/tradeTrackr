import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE - Eliminar trade específico (solo Premium)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: tradeId } = await params

    // VALIDACIÓN CRÍTICA: Solo usuarios Premium pueden eliminar trades
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Error al verificar perfil de usuario' }, 
        { status: 500 }
      )
    }

    const isPremium = profile?.is_premium || false

    // BLOQUEO SERVIDOR: Solo Premium puede eliminar trades
    if (!isPremium) {
      return NextResponse.json(
        { 
          error: 'Función Premium requerida', 
          message: 'Solo los usuarios Premium pueden eliminar trades. Actualiza tu plan para acceder a esta función.',
          premium_required: true
        }, 
        { status: 403 }
      )
    }

    // Verificar que el trade pertenece al usuario antes de eliminar
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('user_id')
      .eq('id', tradeId)
      .single()

    if (tradeError) {
      console.error('Error fetching trade:', tradeError)
      return NextResponse.json(
        { error: 'Trade no encontrado' }, 
        { status: 404 }
      )
    }

    if (trade.user_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar este trade' }, 
        { status: 403 }
      )
    }

    // Eliminar el trade
    const { error: deleteError } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting trade:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar trade' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Trade eliminado exitosamente'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
} 