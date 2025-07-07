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

    console.log('🔧 Normalizando valores de result...')

    // Normalizar todos los valores de result a minúsculas
    const updates = [
      { from: 'Win', to: 'win' },
      { from: 'Loss', to: 'loss' },
      { from: 'BE', to: 'be' },
      { from: 'Breakeven', to: 'breakeven' },
      { from: 'breakeven', to: 'be' } // Unificar breakeven a 'be'
    ]

    let totalUpdated = 0

    for (const update of updates) {
      const { data: trades, error: selectError } = await supabase
        .from('trades')
        .select('id, result')
        .eq('result', update.from)

      if (selectError) {
        console.error(`Error buscando trades con result '${update.from}':`, selectError)
        continue
      }

      if (trades && trades.length > 0) {
        const { error: updateError } = await supabase
          .from('trades')
          .update({ result: update.to })
          .eq('result', update.from)

        if (updateError) {
          console.error(`Error actualizando trades de '${update.from}' a '${update.to}':`, updateError)
        } else {
          totalUpdated += trades.length
          console.log(`✅ Actualizados ${trades.length} trades de '${update.from}' a '${update.to}'`)
        }
      }
    }

    // Recalcular estadísticas después de normalizar
    const { data: allTrades } = await supabase
      .from('trades')
      .select('pnl_percentage, pnl_pips, pnl_money, result')
      .eq('user_id', user.id)

    if (allTrades) {
      const totalPnlPercentage = allTrades.reduce((sum, t) => sum + (t.pnl_percentage || 0), 0)
      const totalPnlPips = allTrades.reduce((sum, t) => sum + (t.pnl_pips || 0), 0)
      const totalPnlMoney = allTrades.reduce((sum, t) => sum + (t.pnl_money || 0), 0)
      
      // Contar con valores normalizados
      const totalTrades = allTrades.length
      const wins = allTrades.filter(t => t.result === 'win').length
      const losses = allTrades.filter(t => t.result === 'loss').length
      const breakevens = allTrades.filter(t => t.result === 'be').length
      const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0

      // Obtener balance del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_balance')
        .eq('id', user.id)
        .single()

      const accountBalance = profile?.account_balance || 1000

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
        console.log('📈 Estadísticas recalculadas con valores normalizados')
        console.log(`   - Win Rate: ${winRate}% (${wins}W/${losses}L/${breakevens}BE)`)
        console.log(`   - Total P&L: ${totalPnlPercentage.toFixed(2)}%`)
      }
    }

    console.log(`🎉 Normalización completada: ${totalUpdated} trades actualizados`)

    return NextResponse.json({ 
      success: true, 
      message: `Valores de result normalizados exitosamente. ${totalUpdated} trades actualizados.`,
      tradesUpdated: totalUpdated
    })

  } catch (error) {
    console.error('💥 Error en normalización:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 