-- Script para añadir los nuevos campos requeridos según las anotaciones de la reunión
-- Estos campos mejorarán el seguimiento detallado de cada trade

-- 1. Añadir nuevos campos a la tabla trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_price DECIMAL(15,8);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS stop_loss DECIMAL(15,8);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS take_profit DECIMAL(15,8);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS lot_size DECIMAL(10,4);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS commission DECIMAL(10,2);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS swap DECIMAL(10,2);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS expert_advisor TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS exit_price DECIMAL(15,8);

-- 2. Añadir comentarios para documentar los nuevos campos
COMMENT ON COLUMN trades.entry_price IS 'Precio de entrada al mercado';
COMMENT ON COLUMN trades.stop_loss IS 'Precio del stop loss';
COMMENT ON COLUMN trades.take_profit IS 'Precio del take profit';
COMMENT ON COLUMN trades.lot_size IS 'Tamaño del lote (ej: 0.01, 0.1, 1.0)';
COMMENT ON COLUMN trades.commission IS 'Comisión pagada por el trade';
COMMENT ON COLUMN trades.swap IS 'Swap/interés del trade';
COMMENT ON COLUMN trades.notes IS 'Notas adicionales del trade';
COMMENT ON COLUMN trades.expert_advisor IS 'Expert Advisor utilizado (si aplica)';
COMMENT ON COLUMN trades.exit_price IS 'Precio de salida del mercado';

-- 3. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_trades_entry_price ON trades(entry_price);
CREATE INDEX IF NOT EXISTS idx_trades_lot_size ON trades(lot_size);
CREATE INDEX IF NOT EXISTS idx_trades_commission ON trades(commission);
CREATE INDEX IF NOT EXISTS idx_trades_expert_advisor ON trades(expert_advisor);

-- 4. Verificar que las columnas se crearon correctamente
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trades' 
AND column_name IN ('entry_price', 'stop_loss', 'take_profit', 'lot_size', 'commission', 'swap', 'notes', 'expert_advisor', 'exit_price')
ORDER BY column_name;

-- 5. Mostrar estadísticas de los nuevos campos
SELECT 
    'NUEVOS CAMPOS AÑADIDOS' as info,
    COUNT(*) as total_trades,
    COUNT(entry_price) as trades_con_precio_entrada,
    COUNT(stop_loss) as trades_con_stop_loss,
    COUNT(take_profit) as trades_con_take_profit,
    COUNT(lot_size) as trades_con_lote,
    COUNT(commission) as trades_con_comision,
    COUNT(notes) as trades_con_notas,
    COUNT(expert_advisor) as trades_con_ea
FROM trades;

SELECT 'Nuevos campos añadidos exitosamente!' as status; 