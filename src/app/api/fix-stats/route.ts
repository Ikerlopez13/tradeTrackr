import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('🔧 Recalculando P&L en pips y dinero...')

    // Obtener todos los trades del usuario que tienen porcentaje pero no pips/dinero
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('id, pair, pnl_percentage, user_id')
      .eq('user_id', user.id)
      .not('pnl_percentage', 'is', null)
      .or('pnl_pips.is.null,pnl_money.is.null')

    if (tradesError) {
      console.error('Error obteniendo trades:', tradesError)
      return NextResponse.json({ error: 'Error obteniendo trades' }, { status: 500 })
    }

    if (!trades || trades.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No hay trades que necesiten recálculo',
        tradesUpdated: 0
      })
    }

    // Obtener balance del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_balance')
      .eq('id', user.id)
      .single()

    const accountBalance = profile?.account_balance || 1000

    console.log(`💰 Balance de cuenta: $${accountBalance}`)
    console.log(`📊 Trades a recalcular: ${trades.length}`)

    // Función para calcular valor por pip
    const getPipValue = (pair: string, accountBalance: number): number => {
      if (!pair) return 0
      
      const lotSize = accountBalance >= 10000 ? 100000 : 
                     accountBalance >= 1000 ? 10000 : 
                     1000
      
      const jpyPairs = ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY']
      const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD']
      const metals = ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD']
      const indices = ['US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'JPN225']
      
      if (jpyPairs.includes(pair)) {
        return (lotSize * 0.01) / 100
      } else if (majorPairs.includes(pair)) {
        return (lotSize * 0.0001) / 10
      } else if (metals.includes(pair)) {
        if (pair === 'XAUUSD') return lotSize * 0.01 / 100
        if (pair === 'XAGUSD') return lotSize * 0.001 / 100
        return lotSize * 0.001 / 100
      } else if (indices.includes(pair)) {
        return lotSize * 0.1 / 100
      } else {
        return (lotSize * 0.0001) / 10
      }
    }

    let updatedCount = 0

    // Recalcular cada trade
    for (const trade of trades) {
      try {
        const percentage = trade.pnl_percentage
        
        // Calcular dinero: balance * (porcentaje / 100)
        const pnl_money = accountBalance * (percentage / 100)
        
        // Calcular pips basado en el par
        const pipValue = getPipValue(trade.pair, accountBalance)
        let pnl_pips = null
        
        if (pipValue > 0) {
          pnl_pips = Math.round((pnl_money / pipValue) * 10) / 10
        }

        // Actualizar el trade
        const { error: updateError } = await supabase
          .from('trades')
          .update({
            pnl_money: Math.round(pnl_money * 100) / 100, // Redondear a 2 decimales
            pnl_pips: pnl_pips
          })
          .eq('id', trade.id)

        if (updateError) {
          console.error(`Error actualizando trade ${trade.id}:`, updateError)
        } else {
          updatedCount++
          console.log(`✅ Trade ${trade.id} actualizado: ${percentage}% → $${pnl_money.toFixed(2)} → ${pnl_pips?.toFixed(1) || 'N/A'} pips`)
        }
      } catch (error) {
        console.error(`Error procesando trade ${trade.id}:`, error)
      }
    }

    // Recalcular estadísticas totales y actualizar user_stats
    const { data: allTrades } = await supabase
      .from('trades')
      .select('pnl_percentage, pnl_pips, pnl_money, result')
      .eq('user_id', user.id)

    if (allTrades) {
      const totalPnlPercentage = allTrades.reduce((sum, t) => sum + (t.pnl_percentage || 0), 0)
      const totalPnlPips = allTrades.reduce((sum, t) => sum + (t.pnl_pips || 0), 0)
      const totalPnlMoney = allTrades.reduce((sum, t) => sum + (t.pnl_money || 0), 0)
      
      // Contar wins, losses, breakevens
      const totalTrades = allTrades.length
      const wins = allTrades.filter(t => t.result === 'win').length
      const losses = allTrades.filter(t => t.result === 'loss').length
      const breakevens = allTrades.filter(t => t.result === 'be').length
      const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0

      const { error: statsError } = await supabase
        .from('user_stats')
        .upsert({
          user_id: user.id,
          total_trades: totalTrades,
          wins: wins,
          losses: losses,
          breakevens: breakevens,
          win_rate: winRate,
          total_pnl_percentage: Math.round(totalPnlPercentage * 100) / 100,
          total_pnl_pips: Math.round(totalPnlPips * 10) / 10,
          total_pnl_money: Math.round(totalPnlMoney * 100) / 100,
          current_balance: accountBalance + totalPnlMoney,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (statsError) {
        console.error('Error actualizando user_stats:', statsError)
      } else {
        console.log('📈 Estadísticas actualizadas en user_stats')
        console.log(`   - Total P&L: ${totalPnlPercentage.toFixed(2)}% | ${totalPnlPips.toFixed(1)} pips | $${totalPnlMoney.toFixed(2)}`)
        console.log(`   - Balance actual: $${(accountBalance + totalPnlMoney).toFixed(2)}`)
      }
    }

    console.log(`🎉 Recálculo completado: ${updatedCount} trades actualizados`)

    return NextResponse.json({ 
      success: true, 
      message: `P&L recalculado exitosamente para ${updatedCount} trades`,
      tradesUpdated: updatedCount
    })

  } catch (error) {
    console.error('💥 Error en recálculo:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 