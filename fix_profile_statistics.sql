-- Script para arreglar todas las estadísticas del perfil
-- Este script asegura que todas las estadísticas se calculen correctamente

-- 1. Primero, eliminar triggers existentes para evitar conflictos
DROP TRIGGER IF EXISTS update_user_stats_trigger ON trades;
DROP TRIGGER IF EXISTS update_stats_on_trade_insert ON trades;
DROP TRIGGER IF EXISTS update_stats_on_trade_update ON trades;
DROP TRIGGER IF EXISTS update_stats_on_trade_delete ON trades;
DROP TRIGGER IF EXISTS on_trade_change ON trades;
DROP TRIGGER IF EXISTS trigger_update_user_stats ON trades;

-- 2. Eliminar función antigua
DROP FUNCTION IF EXISTS update_user_stats() CASCADE;

-- 3. Asegurar que user_stats tenga todas las columnas necesarias
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS breakevens INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_pnl_percentage DECIMAL(10,4) DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_pnl_pips DECIMAL(10,2) DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_pnl_money DECIMAL(15,2) DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS current_balance DECIMAL(15,2) DEFAULT 1000;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. Crear función mejorada para actualizar estadísticas
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    user_uuid UUID;
    account_balance_val DECIMAL(15,2);
    calculated_balance DECIMAL(15,2);
    total_trades_count INTEGER;
    wins_count INTEGER;
    losses_count INTEGER;
    breakevens_count INTEGER;
    total_pnl_percentage_val DECIMAL(10,4);
    total_pnl_pips_val DECIMAL(10,2);
    total_pnl_money_val DECIMAL(15,2);
    win_rate_val DECIMAL(5,2);
BEGIN
    -- Determinar qué user_id usar según la operación
    IF TG_OP = 'DELETE' THEN
        user_uuid := OLD.user_id;
    ELSE
        user_uuid := NEW.user_id;
    END IF;

    -- Obtener el balance inicial del usuario
    SELECT account_balance INTO account_balance_val
    FROM profiles
    WHERE id = user_uuid;

    -- Si no hay balance inicial, usar 1000 como default
    IF account_balance_val IS NULL THEN
        account_balance_val := 1000.00;
        -- Actualizar el perfil con el balance default
        UPDATE profiles SET account_balance = 1000.00 WHERE id = user_uuid;
    END IF;

    -- Calcular todas las estadísticas desde la tabla trades
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN result = 'win' THEN 1 END),
        COUNT(CASE WHEN result = 'loss' THEN 1 END),
        COUNT(CASE WHEN result = 'be' THEN 1 END),
        COALESCE(SUM(pnl_percentage), 0),
        COALESCE(SUM(pnl_pips), 0),
        COALESCE(SUM(pnl_money), 0)
    INTO 
        total_trades_count,
        wins_count,
        losses_count,
        breakevens_count,
        total_pnl_percentage_val,
        total_pnl_pips_val,
        total_pnl_money_val
    FROM trades
    WHERE user_id = user_uuid;

    -- Calcular win rate
    IF total_trades_count > 0 THEN
        win_rate_val := (wins_count::DECIMAL / total_trades_count::DECIMAL) * 100;
    ELSE
        win_rate_val := 0;
    END IF;

    -- Calcular balance actual basado en porcentaje P&L
    -- Fórmula: balance_actual = balance_inicial * (1 + total_pnl_percentage/100)
    calculated_balance := account_balance_val * (1 + total_pnl_percentage_val / 100);

    -- Insertar o actualizar estadísticas
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
        total_pnl_money,
        current_balance,
        win_rate,
        updated_at
    )
    VALUES (
        user_uuid,
        total_trades_count,
        wins_count,
        losses_count,
        breakevens_count,
        wins_count, -- Para compatibilidad con columnas antiguas
        losses_count,
        breakevens_count,
        total_pnl_percentage_val,
        total_pnl_pips_val,
        total_pnl_money_val,
        calculated_balance,
        win_rate_val,
        NOW()
    )
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
        current_balance = EXCLUDED.current_balance,
        win_rate = EXCLUDED.win_rate,
        updated_at = EXCLUDED.updated_at;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crear trigger para todas las operaciones
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- 6. Crear función para recalcular estadísticas cuando se actualiza el balance
CREATE OR REPLACE FUNCTION trigger_recalculate_on_balance_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo recalcular si el account_balance cambió
    IF OLD.account_balance IS DISTINCT FROM NEW.account_balance THEN
        -- Simular un update en trades para disparar el recálculo
        IF EXISTS (SELECT 1 FROM trades WHERE user_id = NEW.id LIMIT 1) THEN
            UPDATE trades 
            SET updated_at = NOW() 
            WHERE user_id = NEW.id 
            AND id = (SELECT id FROM trades WHERE user_id = NEW.id ORDER BY created_at DESC LIMIT 1);
        ELSE
            -- Si no hay trades, crear entrada vacía en user_stats
            INSERT INTO user_stats (
                user_id, total_trades, wins, losses, breakevens,
                total_pnl_percentage, total_pnl_pips, total_pnl_money,
                current_balance, win_rate, updated_at
            ) VALUES (
                NEW.id, 0, 0, 0, 0, 0, 0, 0, NEW.account_balance, 0, NOW()
            ) ON CONFLICT (user_id) DO UPDATE SET
                current_balance = NEW.account_balance,
                updated_at = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Crear trigger para actualizar estadísticas cuando cambia el balance
DROP TRIGGER IF EXISTS recalculate_stats_on_balance_update ON profiles;
CREATE TRIGGER recalculate_stats_on_balance_update
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_on_balance_update();

-- 8. Recalcular estadísticas para todos los usuarios existentes
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM trades LOOP
        -- Disparar recálculo actualizando el primer trade
        UPDATE trades 
        SET updated_at = NOW() 
        WHERE user_id = user_record.user_id 
        AND id = (SELECT id FROM trades WHERE user_id = user_record.user_id ORDER BY created_at ASC LIMIT 1);
    END LOOP;
    
    -- También recalcular para usuarios sin trades
    FOR user_record IN SELECT id FROM profiles WHERE id NOT IN (SELECT DISTINCT user_id FROM trades) LOOP
        INSERT INTO user_stats (
            user_id, total_trades, wins, losses, breakevens,
            total_pnl_percentage, total_pnl_pips, total_pnl_money,
            current_balance, win_rate, updated_at
        ) VALUES (
            user_record.id, 0, 0, 0, 0, 0, 0, 0, 
            COALESCE((SELECT account_balance FROM profiles WHERE id = user_record.id), 1000), 
            0, NOW()
        ) ON CONFLICT (user_id) DO UPDATE SET
            current_balance = COALESCE((SELECT account_balance FROM profiles WHERE id = user_record.id), 1000),
            updated_at = NOW();
    END LOOP;
END $$;

-- 9. Verificar que las estadísticas estén correctas
SELECT 
    'VERIFICACIÓN DE ESTADÍSTICAS' as titulo,
    p.username,
    p.account_balance as balance_inicial,
    us.current_balance as balance_actual,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    us.win_rate,
    us.total_pnl_percentage,
    us.total_pnl_pips,
    us.total_pnl_money,
    us.updated_at
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
ORDER BY p.created_at DESC;

-- 10. Comentarios para documentar las columnas
COMMENT ON COLUMN user_stats.wins IS 'Número de trades ganadores';
COMMENT ON COLUMN user_stats.losses IS 'Número de trades perdedores';
COMMENT ON COLUMN user_stats.breakevens IS 'Número de trades en breakeven';
COMMENT ON COLUMN user_stats.total_pnl_percentage IS 'Suma total de P&L en porcentaje';
COMMENT ON COLUMN user_stats.total_pnl_pips IS 'Suma total de P&L en pips';
COMMENT ON COLUMN user_stats.total_pnl_money IS 'Suma total de P&L en dinero';
COMMENT ON COLUMN user_stats.current_balance IS 'Balance actual calculado basado en P&L';
COMMENT ON COLUMN user_stats.win_rate IS 'Porcentaje de trades ganadores';

SELECT 'Script de estadísticas completado exitosamente!' as status; 