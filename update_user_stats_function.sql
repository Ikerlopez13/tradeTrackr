-- Función mejorada para actualizar estadísticas de usuario incluyendo balance actual
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    user_initial_balance DECIMAL(15,2);
    total_percentage_pnl DECIMAL(10,2);
    calculated_current_balance DECIMAL(15,2);
BEGIN
    -- Usar configuración de seguridad para evitar problemas con RLS
    PERFORM set_config('row_security', 'off', true);
    
    -- Obtener el balance inicial del usuario
    SELECT account_balance INTO user_initial_balance
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Si no hay balance inicial, usar 1000 como default
    IF user_initial_balance IS NULL THEN
        user_initial_balance := 1000;
    END IF;
    
    -- Calcular estadísticas actualizadas
    WITH trade_stats AS (
        SELECT 
            COUNT(*) as total_trades,
            COUNT(CASE WHEN result = 'win' THEN 1 END) as wins,
            COUNT(CASE WHEN result = 'loss' THEN 1 END) as losses,
            COUNT(CASE WHEN result = 'be' THEN 1 END) as breakevens,
            COALESCE(SUM(pnl_percentage), 0) as total_pnl_percentage,
            COALESCE(SUM(pnl_pips), 0) as total_pnl_pips,
            COALESCE(SUM(pnl_money), 0) as total_pnl_money
        FROM trades 
        WHERE user_id = NEW.user_id
    )
    SELECT 
        total_pnl_percentage INTO total_percentage_pnl
    FROM trade_stats;
    
    -- Calcular balance actual basado en porcentaje de P&L
    -- Fórmula: balance_actual = balance_inicial * (1 + total_pnl_percentage/100)
    calculated_current_balance := user_initial_balance * (1 + COALESCE(total_percentage_pnl, 0) / 100);
    
    INSERT INTO user_stats (
        user_id,
        total_trades,
        winning_trades,
        losing_trades,
        break_even_trades,
        wins,
        losses,
        breakevens,
        total_pnl_percentage,
        total_pnl_pips,
        total_pnl_money,
        current_balance,
        updated_at
    )
    SELECT 
        NEW.user_id,
        total_trades,
        wins,
        losses,
        breakevens,
        wins,
        losses,
        breakevens,
        total_pnl_percentage,
        total_pnl_pips,
        total_pnl_money,
        calculated_current_balance,
        NOW()
    FROM (
        SELECT 
            COUNT(*) as total_trades,
            COUNT(CASE WHEN result = 'win' THEN 1 END) as wins,
            COUNT(CASE WHEN result = 'loss' THEN 1 END) as losses,
            COUNT(CASE WHEN result = 'be' THEN 1 END) as breakevens,
            COALESCE(SUM(pnl_percentage), 0) as total_pnl_percentage,
            COALESCE(SUM(pnl_pips), 0) as total_pnl_pips,
            COALESCE(SUM(pnl_money), 0) as total_pnl_money
        FROM trades 
        WHERE user_id = NEW.user_id
    ) stats
    ON CONFLICT (user_id) 
    DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        winning_trades = EXCLUDED.winning_trades,
        losing_trades = EXCLUDED.losing_trades,
        break_even_trades = EXCLUDED.break_even_trades,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        breakevens = EXCLUDED.breakevens,
        total_pnl_percentage = EXCLUDED.total_pnl_percentage,
        total_pnl_pips = EXCLUDED.total_pnl_pips,
        total_pnl_money = EXCLUDED.total_pnl_money,
        current_balance = EXCLUDED.current_balance,
        updated_at = EXCLUDED.updated_at;

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