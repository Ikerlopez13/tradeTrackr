import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Verificar que el usuario esté autenticado y sea admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Ejecutar las migraciones SQL
    const migrations = [
      // Añadir nuevos campos a la tabla trades
      `ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_price DECIMAL(15,8);`,
      `ALTER TABLE trades ADD COLUMN IF NOT EXISTS stop_loss DECIMAL(15,8);`,
      `ALTER TABLE trades ADD COLUMN IF NOT EXISTS take_profit DECIMAL(15,8);`,
      `ALTER TABLE trades ADD COLUMN IF NOT EXISTS lot_size DECIMAL(10,4);`,
      `ALTER TABLE trades ADD COLUMN IF NOT EXISTS commission DECIMAL(10,2);`,
      `ALTER TABLE trades ADD COLUMN IF NOT EXISTS swap DECIMAL(10,2);`,
      `ALTER TABLE trades ADD COLUMN IF NOT EXISTS notes TEXT;`,
      `ALTER TABLE trades ADD COLUMN IF NOT EXISTS expert_advisor TEXT;`,
      `ALTER TABLE trades ADD COLUMN IF NOT EXISTS exit_price DECIMAL(15,8);`,
      
      // Añadir comentarios para documentar los campos
      `COMMENT ON COLUMN trades.entry_price IS 'Precio de entrada del trade';`,
      `COMMENT ON COLUMN trades.stop_loss IS 'Precio de stop loss';`,
      `COMMENT ON COLUMN trades.take_profit IS 'Precio de take profit';`,
      `COMMENT ON COLUMN trades.lot_size IS 'Tamaño del lote';`,
      `COMMENT ON COLUMN trades.commission IS 'Comisión pagada';`,
      `COMMENT ON COLUMN trades.swap IS 'Costo de swap';`,
      `COMMENT ON COLUMN trades.notes IS 'Notas adicionales del trade';`,
      `COMMENT ON COLUMN trades.expert_advisor IS 'Expert Advisor utilizado';`,
      `COMMENT ON COLUMN trades.exit_price IS 'Precio de salida del trade';`,
      
      // Crear índices para mejorar el rendimiento
      `CREATE INDEX IF NOT EXISTS idx_trades_entry_price ON trades(entry_price);`,
      `CREATE INDEX IF NOT EXISTS idx_trades_lot_size ON trades(lot_size);`,
      `CREATE INDEX IF NOT EXISTS idx_trades_expert_advisor ON trades(expert_advisor);`
    ]

    const results = []
    
    for (const migration of migrations) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: migration })
        if (error) {
          console.error('Error ejecutando migración:', migration, error)
          results.push({ migration, error: error.message })
        } else {
          results.push({ migration, success: true })
        }
      } catch (err) {
        console.error('Error ejecutando migración:', migration, err)
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
        results.push({ migration, error: errorMessage })
      }
    }

    return NextResponse.json({ 
      message: 'Migraciones completadas',
      results 
    })

  } catch (error) {
    console.error('Error en migración:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: errorMessage 
    }, { status: 500 })
  }
} 