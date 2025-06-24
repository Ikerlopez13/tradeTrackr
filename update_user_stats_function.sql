-- Actualizar la función de estadísticas para incluir P&L
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
        total_pnl_percentage,
        total_pnl_pips
    )
    SELECT 
        NEW.user_id,
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE result = 'win') as wins,
        COUNT(*) FILTER (WHERE result = 'loss') as losses,
        COUNT(*) FILTER (WHERE result = 'be') as breakevens,
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
        total_pnl_percentage = EXCLUDED.total_pnl_percentage,
        total_pnl_pips = EXCLUDED.total_pnl_pips,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Restaurar configuración de seguridad
    PERFORM set_config('row_security', 'on', true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar nuevas columnas a user_stats si no existen
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS total_pnl_percentage DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pnl_pips DECIMAL(10,2) DEFAULT 0;

-- Comentarios para las nuevas columnas
COMMENT ON COLUMN user_stats.total_pnl_percentage IS 'Suma total de P&L en porcentaje';
COMMENT ON COLUMN user_stats.total_pnl_pips IS 'Suma total de P&L en pips';

-- Recalcular estadísticas existentes
INSERT INTO user_stats (
    user_id, 
    total_trades, 
    wins, 
    losses, 
    breakevens,
    total_pnl_percentage,
    total_pnl_pips
)
SELECT 
    user_id,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE result = 'win') as wins,
    COUNT(*) FILTER (WHERE result = 'loss') as losses,
    COUNT(*) FILTER (WHERE result = 'be') as breakevens,
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
    total_pnl_percentage = EXCLUDED.total_pnl_percentage,
    total_pnl_pips = EXCLUDED.total_pnl_pips,
    updated_at = CURRENT_TIMESTAMP; 