-- Agregar columna pnl_money a la tabla trades
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS pnl_money DECIMAL(15,2);

-- Comentario para el nuevo campo
COMMENT ON COLUMN trades.pnl_money IS 'Ganancia/pérdida en dinero';

-- Agregar columna total_pnl_money a user_stats
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS total_pnl_money DECIMAL(15,2) DEFAULT 0;

-- Comentario para el nuevo campo
COMMENT ON COLUMN user_stats.total_pnl_money IS 'Suma total de P&L en dinero';

-- Actualizar la función de estadísticas para incluir P&L en dinero
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Usar configuración de seguridad para evitar problemas con RLS
    PERFORM set_config('row_security', 'off', true);
    
    INSERT INTO user_stats (
        user_id, 
        total_trades, 
        wins, 
        losses, 
        breakevens,
        winning_trades,
        losing_trades,
        break_even_trades,
        total_pnl_percentage,
        total_pnl_pips,
        total_pnl_money
    )
    SELECT 
        NEW.user_id,
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE result = 'win') as wins,
        COUNT(*) FILTER (WHERE result = 'loss') as losses,
        COUNT(*) FILTER (WHERE result = 'be') as breakevens,
        COUNT(*) FILTER (WHERE result = 'win') as winning_trades,
        COUNT(*) FILTER (WHERE result = 'loss') as losing_trades,
        COUNT(*) FILTER (WHERE result = 'be') as break_even_trades,
        COALESCE(SUM(pnl_percentage), 0) as total_pnl_percentage,
        COALESCE(SUM(pnl_pips), 0) as total_pnl_pips,
        COALESCE(SUM(pnl_money), 0) as total_pnl_money
    FROM trades 
    WHERE user_id = NEW.user_id
    ON CONFLICT (user_id) 
    DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        breakevens = EXCLUDED.breakevens,
        winning_trades = EXCLUDED.winning_trades,
        losing_trades = EXCLUDED.losing_trades,
        break_even_trades = EXCLUDED.break_even_trades,
        total_pnl_percentage = EXCLUDED.total_pnl_percentage,
        total_pnl_pips = EXCLUDED.total_pnl_pips,
        total_pnl_money = EXCLUDED.total_pnl_money,
        last_updated = CURRENT_TIMESTAMP;
    
    -- Restaurar configuración de seguridad
    PERFORM set_config('row_security', 'on', true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_trades_pnl_money ON trades(pnl_money); 