-- Script para arreglar el cálculo de balance cuando se actualiza account_balance
-- Este script recalcula las estadísticas basándose en el nuevo balance inicial

-- 1. Crear función para recalcular estadísticas de un usuario específico
CREATE OR REPLACE FUNCTION recalculate_user_stats(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    user_account_balance DECIMAL(15,2);
    trade_count INTEGER;
    win_count INTEGER;
    loss_count INTEGER;
    be_count INTEGER;
    total_pnl_pct DECIMAL(10,4);
    total_pnl_pips DECIMAL(10,2);
    total_pnl_money DECIMAL(15,2);
    calculated_current_balance DECIMAL(15,2);
BEGIN
    -- Obtener el balance inicial del perfil
    SELECT account_balance INTO user_account_balance
    FROM profiles 
    WHERE id = target_user_id;
    
    IF user_account_balance IS NULL THEN
        user_account_balance := 1000.00;
    END IF;
    
    -- Calcular estadísticas de trades
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE result = 'Win'),
        COUNT(*) FILTER (WHERE result = 'Loss'),
        COUNT(*) FILTER (WHERE result = 'BE'),
        COALESCE(SUM(pnl_percentage), 0),
        COALESCE(SUM(pnl_pips), 0),
        COALESCE(SUM(pnl_money), 0)
    INTO 
        trade_count, win_count, loss_count, be_count,
        total_pnl_pct, total_pnl_pips, total_pnl_money
    FROM trades 
    WHERE user_id = target_user_id;
    
    -- Calcular balance actual: balance_inicial * (1 + total_pnl_percentage/100)
    calculated_current_balance := user_account_balance * (1 + total_pnl_pct/100);
    
    -- Actualizar o insertar estadísticas
    INSERT INTO user_stats (
        user_id, total_trades, wins, losses, breakevens,
        total_pnl_percentage, total_pnl_pips, total_pnl_money, current_balance,
        updated_at
    ) VALUES (
        target_user_id, trade_count, win_count, loss_count, be_count,
        total_pnl_pct, total_pnl_pips, total_pnl_money, calculated_current_balance,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        breakevens = EXCLUDED.breakevens,
        total_pnl_percentage = EXCLUDED.total_pnl_percentage,
        total_pnl_pips = EXCLUDED.total_pnl_pips,
        total_pnl_money = EXCLUDED.total_pnl_money,
        current_balance = EXCLUDED.current_balance,
        updated_at = EXCLUDED.updated_at;
        
    RAISE NOTICE 'Stats recalculated for user %: Balance inicial=%, P&L=%, Balance actual=%', 
        target_user_id, user_account_balance, total_pnl_pct, calculated_current_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear trigger que se ejecute cuando se actualiza account_balance
CREATE OR REPLACE FUNCTION trigger_recalculate_on_balance_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo recalcular si el account_balance cambió
    IF OLD.account_balance IS DISTINCT FROM NEW.account_balance THEN
        PERFORM recalculate_user_stats(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el trigger en la tabla profiles
DROP TRIGGER IF EXISTS recalculate_stats_on_balance_update ON profiles;
CREATE TRIGGER recalculate_stats_on_balance_update
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_on_balance_update();

-- 4. Recalcular estadísticas para el usuario actual (reemplaza con tu user_id real)
-- Ejecuta esto manualmente después de aplicar el script:
-- SELECT recalculate_user_stats('tu-user-id-aqui');

COMMENT ON FUNCTION recalculate_user_stats(UUID) IS 'Recalcula las estadísticas de un usuario basándose en sus trades y balance inicial actual';
COMMENT ON FUNCTION trigger_recalculate_on_balance_update() IS 'Trigger que recalcula estadísticas cuando se actualiza account_balance';
COMMENT ON TRIGGER recalculate_stats_on_balance_update ON profiles IS 'Recalcula automáticamente las estadísticas cuando cambia el balance inicial'; 