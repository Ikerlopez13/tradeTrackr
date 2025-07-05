import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Obtener comentarios de un trade específico
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

    // Obtener comentarios del trade
    const { data: comments, error } = await supabase
      .from('trade_comments')
      .select(`
        id,
        user_id,
        content,
        created_at,
        updated_at,
        profiles!inner(username, avatar_url)
      `)
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Error al obtener comentarios' },
        { status: 500 }
      )
    }

    // Formatear comentarios para incluir información del usuario
    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      username: (comment.profiles as any).username,
      avatar_url: (comment.profiles as any).avatar_url,
      isOwner: comment.user_id === user.id
    }))

    return NextResponse.json({
      comments: formattedComments,
      count: formattedComments.length
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Agregar comentario a un trade
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

    const { trade_id, content } = await request.json()

    if (!trade_id || !content) {
      return NextResponse.json(
        { error: 'trade_id y content son requeridos' },
        { status: 400 }
      )
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: 'El comentario no puede estar vacío' },
        { status: 400 }
      )
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'El comentario no puede tener más de 500 caracteres' },
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

    // Insertar comentario
    const { data, error } = await supabase
      .from('trade_comments')
      .insert({
        trade_id: trade_id,
        user_id: user.id,
        content: content.trim()
      })
      .select(`
        id,
        user_id,
        content,
        created_at,
        updated_at,
        profiles!inner(username, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error inserting comment:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json(
        { error: 'Error al agregar comentario', details: error.message },
        { status: 500 }
      )
    }

    // Formatear respuesta
    const formattedComment = {
      id: data.id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
      username: (data.profiles as any).username,
      avatar_url: (data.profiles as any).avatar_url,
      isOwner: true
    }

    return NextResponse.json({
      message: 'Comentario agregado exitosamente',
      comment: formattedComment
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar comentario
export async function PUT(request: NextRequest) {
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

    const { comment_id, content } = await request.json()

    if (!comment_id || !content) {
      return NextResponse.json(
        { error: 'comment_id y content son requeridos' },
        { status: 400 }
      )
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: 'El comentario no puede estar vacío' },
        { status: 400 }
      )
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'El comentario no puede tener más de 500 caracteres' },
        { status: 400 }
      )
    }

    // Actualizar comentario (solo si es del usuario actual)
    const { data, error } = await supabase
      .from('trade_comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', comment_id)
      .eq('user_id', user.id)
      .select(`
        id,
        user_id,
        content,
        created_at,
        updated_at,
        profiles!inner(username, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return NextResponse.json(
        { error: 'Error al actualizar comentario' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Comentario no encontrado o no tienes permisos' },
        { status: 404 }
      )
    }

    // Formatear respuesta
    const formattedComment = {
      id: data.id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
      username: (data.profiles as any).username,
      avatar_url: (data.profiles as any).avatar_url,
      isOwner: true
    }

    return NextResponse.json({
      message: 'Comentario actualizado exitosamente',
      comment: formattedComment
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar comentario
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

    const { comment_id } = await request.json()

    if (!comment_id) {
      return NextResponse.json(
        { error: 'comment_id es requerido' },
        { status: 400 }
      )
    }

    // Eliminar comentario (solo si es del usuario actual)
    const { error } = await supabase
      .from('trade_comments')
      .delete()
      .eq('id', comment_id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json(
        { error: 'Error al eliminar comentario' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Comentario eliminado exitosamente'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 