import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE - Eliminar todos los trades del usuario (solo Premium)
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

    // VALIDACIÓN CRÍTICA: Solo usuarios Premium pueden eliminar todos los trades
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

    // BLOQUEO SERVIDOR: Solo Premium puede eliminar todos los trades
    if (!isPremium) {
      return NextResponse.json(
        { 
          error: 'Función Premium requerida', 
          message: 'Solo los usuarios Premium pueden eliminar todos los trades. Esta es una función avanzada que requiere suscripción Premium.',
          premium_required: true
        }, 
        { status: 403 }
      )
    }

    // Contar trades antes de eliminar para logging
    const { count: tradesCount, error: countError } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error counting trades:', countError)
    }

    // Eliminar todos los trades del usuario
    const { error: deleteError } = await supabase
      .from('trades')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting all trades:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar trades' }, 
        { status: 500 }
      )
    }

    console.log(`✅ Premium user ${user.email} deleted ${tradesCount || 'unknown'} trades`)

    return NextResponse.json({ 
      message: 'Todos los trades han sido eliminados exitosamente',
      deleted_count: tradesCount || 0
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
} 