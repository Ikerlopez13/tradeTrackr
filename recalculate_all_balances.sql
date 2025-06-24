-- Recalcular todos los balances y estadísticas de usuarios
-- Este script actualiza las estadísticas existentes con el nuevo sistema de balance automático

-- Función temporal para recalcular estadísticas de un usuario específico
CREATE OR REPLACE FUNCTION recalculate_user_stats(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    user_initial_balance DECIMAL(15,2);
    total_percentage_pnl DECIMAL(10,2);
    calculated_current_balance DECIMAL(15,2);
BEGIN
    -- Obtener el balance inicial del usuario
    SELECT account_balance INTO user_initial_balance
    FROM profiles 
    WHERE id = target_user_id;
    
    -- Si no hay balance inicial, usar 1000 como default
    IF user_initial_balance IS NULL THEN
        user_initial_balance := 1000;
        -- Actualizar el perfil con el balance default
        UPDATE profiles SET account_balance = 1000 WHERE id = target_user_id;
    END IF;
    
    -- Calcular estadísticas del usuario
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
        WHERE user_id = target_user_id
    )
    SELECT total_pnl_percentage INTO total_percentage_pnl FROM trade_stats;
    
    -- Calcular balance actual basado en porcentaje de P&L
    calculated_current_balance := user_initial_balance * (1 + COALESCE(total_percentage_pnl, 0) / 100);
    
    -- Actualizar o insertar estadísticas
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
        target_user_id,
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
        WHERE user_id = target_user_id
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
END;
$$ LANGUAGE plpgsql;

-- Recalcular estadísticas para todos los usuarios existentes
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM profiles LOOP
        PERFORM recalculate_user_stats(user_record.id);
    END LOOP;
END $$;

-- Eliminar la función temporal
DROP FUNCTION recalculate_user_stats(UUID);

-- Mensaje de confirmación
SELECT 'Recálculo de balances completado exitosamente' as status; 