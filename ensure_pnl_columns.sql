-- Script para asegurar que las columnas P&L existan en la tabla trades
-- Este script garantiza que podamos almacenar P&L en porcentaje, pips y dinero

-- 1. Verificar y agregar columnas P&L si no existen
ALTER TABLE trades ADD COLUMN IF NOT EXISTS pnl_percentage DECIMAL(10,4);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS pnl_pips DECIMAL(10,2);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS pnl_money DECIMAL(15,2);

-- 2. Agregar comentarios para documentar las columnas
COMMENT ON COLUMN trades.pnl_percentage IS 'Ganancia/pérdida en porcentaje (ej: 2.5 para +2.5%)';
COMMENT ON COLUMN trades.pnl_pips IS 'Ganancia/pérdida en pips (ej: 50.5 para +50.5 pips)';
COMMENT ON COLUMN trades.pnl_money IS 'Ganancia/pérdida en dinero (ej: 150.75 para +$150.75)';

-- 3. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_trades_pnl_percentage ON trades(pnl_percentage);
CREATE INDEX IF NOT EXISTS idx_trades_pnl_pips ON trades(pnl_pips);
CREATE INDEX IF NOT EXISTS idx_trades_pnl_money ON trades(pnl_money);

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
AND column_name IN ('pnl_percentage', 'pnl_pips', 'pnl_money')
ORDER BY column_name;

-- 5. Mostrar estadísticas de P&L existentes
SELECT 
    'ESTADÍSTICAS P&L' as info,
    COUNT(*) as total_trades,
    COUNT(pnl_percentage) as trades_con_porcentaje,
    COUNT(pnl_pips) as trades_con_pips,
    COUNT(pnl_money) as trades_con_dinero,
    AVG(pnl_percentage) as promedio_porcentaje,
    AVG(pnl_pips) as promedio_pips,
    AVG(pnl_money) as promedio_dinero
FROM trades;

SELECT 'Columnas P&L verificadas y listas!' as status; 