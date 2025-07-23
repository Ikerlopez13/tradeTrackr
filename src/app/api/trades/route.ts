import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Obtener trades del usuario
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

    // Obtener trades del usuario autenticado
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching trades:', error)
      return NextResponse.json(
        { error: 'Error al obtener trades' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ trades })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
}

// POST - Crear nuevo trade con validaciones de seguridad
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

    // Obtener datos del request
    const body = await request.json()
    let {
      title,
      pair,
      timeframe,
      session,
      bias,
      risk_reward,
      result,
      feeling,
      description,
      confluences,
      pnl_percentage,
      pnl_pips,
      pnl_money,
      screenshot_url,
      is_public,
      entry_price,
      stop_loss,
      take_profit,
      exit_price,
      lot_size,
      commission,
      swap,
      notes,
      expert_advisor
    } = body

    // Validaciones básicas
    if (!title || !pair || !timeframe || !risk_reward || !bias || !result) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' }, 
        { status: 400 }
      )
    }

    // LÓGICA DE CÁLCULO AUTOMÁTICO DE P&L
    // Obtener balance del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_balance')
      .eq('id', user.id)
      .single()

    const accountBalance = profile?.account_balance || 1000

    // Convertir strings a números
    const pnlMoneyNum = pnl_money ? parseFloat(pnl_money) : null
    const pnlPercentageNum = pnl_percentage ? parseFloat(pnl_percentage) : null

    // CASO 1: Solo se proporciona dinero, calcular porcentaje
    if (pnlMoneyNum !== null && pnlPercentageNum === null) {
      const calculatedPercentage = (pnlMoneyNum / accountBalance) * 100
      pnl_percentage = Math.round(calculatedPercentage * 10000) / 10000 // 4 decimales
      
      console.log(`🔄 Calculado P&L porcentaje: ${pnl_percentage}% basado en $${pnlMoneyNum}`)
    }

    // CASO 2: Solo se proporciona porcentaje, calcular dinero
    if (pnlPercentageNum !== null && pnlMoneyNum === null) {
      const calculatedMoney = (accountBalance * pnlPercentageNum) / 100
      pnl_money = Math.round(calculatedMoney * 100) / 100 // 2 decimales
      
      console.log(`🔄 Calculado P&L dinero: $${pnl_money} basado en ${pnlPercentageNum}%`)
    }

    // CASO 3: Se proporcionan ambos, validar consistencia
    if (pnlMoneyNum !== null && pnlPercentageNum !== null) {
      const expectedPercentage = (pnlMoneyNum / accountBalance) * 100
      const percentageDiff = Math.abs(expectedPercentage - pnlPercentageNum)
      
      // Si la diferencia es mayor al 5%, usar el dinero como fuente de verdad
      if (percentageDiff > 5) {
        pnl_percentage = Math.round(expectedPercentage * 10000) / 10000
        console.log(`🔄 Corregido P&L inconsistente: ${pnlPercentageNum}% → ${pnl_percentage}%`)
      }
    }

    // VALIDACIÓN CRÍTICA: Verificar límites de usuario
    const { data: profileCheck, error: profileError } = await supabase
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

    const isPremium = profileCheck?.is_premium || false

    // Si no es premium, verificar límite de trades
    if (!isPremium) {
      const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('total_trades')
        .eq('user_id', user.id)
        .single()

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error fetching stats:', statsError)
        return NextResponse.json(
          { error: 'Error al verificar estadísticas' }, 
          { status: 500 }
        )
      }

      const totalTrades = stats?.total_trades || 0
      
      // BLOQUEO SERVIDOR: Máximo 3 trades para usuarios gratuitos
      if (totalTrades >= 3) {
        return NextResponse.json(
          { 
            error: 'Límite de trades alcanzado', 
            message: 'Has alcanzado el límite de 3 trades gratuitos. Actualiza a Premium para continuar.',
            premium_required: true
          }, 
          { status: 403 }
        )
      }
    }

    // Insertar trade - Solo si pasa todas las validaciones
    const { data: trade, error: insertError } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        title,
        pair,
        timeframe,
        session,
        bias,
        risk_reward,
        result,
        feeling,
        description,
        confluences,
        pnl_percentage,
        pnl_pips,
        pnl_money,
        screenshot_url,
        is_public,
        entry_price,
        stop_loss,
        take_profit,
        exit_price,
        lot_size,
        commission,
        swap,
        notes,
        expert_advisor
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting trade:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar trade' }, 
        { status: 500 }
      )
    }

    console.log(`✅ Trade guardado exitosamente:`, {
      id: trade.id,
      pnl_money: trade.pnl_money,
      pnl_percentage: trade.pnl_percentage,
      account_balance: accountBalance
    })

    return NextResponse.json({ 
      trade,
      message: 'Trade guardado exitosamente',
      calculated_values: {
        pnl_money: trade.pnl_money,
        pnl_percentage: trade.pnl_percentage
      }
    })

  } catch (error) {
    console.error('Error creating trade:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
} 