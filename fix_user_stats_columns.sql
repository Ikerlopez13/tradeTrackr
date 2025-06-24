-- Fix user_stats table column names to match the function
-- The function is using wins, losses, breakevens but table has winning_trades, losing_trades, break_even_trades

-- First, let's check what columns exist and add missing ones
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS breakevens INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_pnl_percentage DECIMAL(10,2) DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_pnl_pips DECIMAL(10,2) DEFAULT 0;

-- Update the function to use the correct column names
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
        total_pnl_pips
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
        COALESCE(SUM(pnl_pips), 0) as total_pnl_pips
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
        last_updated = CURRENT_TIMESTAMP;
    
    -- Restaurar configuración de seguridad
    PERFORM set_config('row_security', 'on', true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalcular estadísticas existentes para llenar las nuevas columnas
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
    total_pnl_pips
)
SELECT 
    user_id,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE result = 'win') as wins,
    COUNT(*) FILTER (WHERE result = 'loss') as losses,
    COUNT(*) FILTER (WHERE result = 'be') as breakevens,
    COUNT(*) FILTER (WHERE result = 'win') as winning_trades,
    COUNT(*) FILTER (WHERE result = 'loss') as losing_trades,
    COUNT(*) FILTER (WHERE result = 'be') as break_even_trades,
    COALESCE(SUM(pnl_percentage), 0) as total_pnl_percentage,
    COALESCE(SUM(pnl_pips), 0) as total_pnl_pips
FROM trades 
GROUP BY user_id
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
    last_updated = CURRENT_TIMESTAMP;

-- Comentarios para las nuevas columnas
COMMENT ON COLUMN user_stats.wins IS 'Número de trades ganadores (alias de winning_trades)';
COMMENT ON COLUMN user_stats.losses IS 'Número de trades perdedores (alias de losing_trades)';
COMMENT ON COLUMN user_stats.breakevens IS 'Número de trades en break even (alias de break_even_trades)';
COMMENT ON COLUMN user_stats.total_pnl_percentage IS 'Suma total de P&L en porcentaje';
COMMENT ON COLUMN user_stats.total_pnl_pips IS 'Suma total de P&L en pips'; 