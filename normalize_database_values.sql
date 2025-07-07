-- Script para normalizar todos los valores de result en la base de datos
-- Esto corregirá las inconsistencias que están causando cálculos incorrectos

-- 1. Primero, ver qué valores tenemos actualmente
SELECT 
    'VALORES ACTUALES:' as info,
    result,
    COUNT(*) as cantidad
FROM trades 
GROUP BY result
ORDER BY result;

-- 2. Normalizar todos los valores a minúsculas
UPDATE trades SET result = 'win' WHERE result = 'Win';
UPDATE trades SET result = 'loss' WHERE result = 'Loss';
UPDATE trades SET result = 'be' WHERE result = 'BE';
UPDATE trades SET result = 'be' WHERE result = 'Breakeven';
UPDATE trades SET result = 'be' WHERE result = 'breakeven';

-- 3. Verificar que la normalización funcionó
SELECT 
    'VALORES DESPUÉS DE NORMALIZAR:' as info,
    result,
    COUNT(*) as cantidad
FROM trades 
GROUP BY result
ORDER BY result;

-- 4. Actualizar el trigger para usar valores normalizados
DROP TRIGGER IF EXISTS update_user_stats_trigger ON trades;
DROP FUNCTION IF EXISTS update_user_stats() CASCADE;

CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    user_uuid UUID;
    account_balance_val DECIMAL(10,2);
    calculated_balance DECIMAL(10,2);
    total_trades_count INTEGER;
    wins_count INTEGER;
    losses_count INTEGER;
    breakevens_count INTEGER;
    total_pnl_percentage_val DECIMAL(10,4);
    total_pnl_pips_val DECIMAL(10,2);
    total_pnl_money_val DECIMAL(10,2);
    trade_pnl RECORD;
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
    END IF;

    -- Calcular todas las estadísticas desde la tabla trades (usando valores normalizados)
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

    -- Calcular balance actual basado en porcentaje de ganancias/pérdidas
    calculated_balance := account_balance_val;
    
    -- Aplicar cada trade's porcentaje para calcular balance final
    -- Esto simula crecimiento/pérdida compuesta
    FOR trade_pnl IN 
        SELECT pnl_percentage 
        FROM trades 
        WHERE user_id = user_uuid 
        ORDER BY created_at ASC
    LOOP
        calculated_balance := calculated_balance * (1 + trade_pnl.pnl_percentage / 100.0);
    END LOOP;

    -- Insertar o actualizar user_stats
    INSERT INTO user_stats (
        user_id,
        total_trades,
        wins,
        losses,
        breakevens,
        win_rate,
        total_pnl_percentage,
        total_pnl_pips,
        total_pnl_money,
        current_balance,
        updated_at
    )
    VALUES (
        user_uuid,
        total_trades_count,
        wins_count,
        losses_count,
        breakevens_count,
        CASE WHEN total_trades_count > 0 THEN (wins_count::DECIMAL / total_trades_count::DECIMAL) * 100 ELSE 0 END,
        total_pnl_percentage_val,
        total_pnl_pips_val,
        total_pnl_money_val,
        calculated_balance,
        NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        breakevens = EXCLUDED.breakevens,
        win_rate = EXCLUDED.win_rate,
        total_pnl_percentage = EXCLUDED.total_pnl_percentage,
        total_pnl_pips = EXCLUDED.total_pnl_pips,
        total_pnl_money = EXCLUDED.total_pnl_money,
        current_balance = EXCLUDED.current_balance,
        updated_at = EXCLUDED.updated_at;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para todas las operaciones (INSERT, UPDATE, DELETE)
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- 5. Forzar recálculo para todos los usuarios existentes
DO $$
DECLARE
    user_record RECORD;
    trade_id UUID;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM trades LOOP
        -- Obtener el primer trade del usuario para trigger recalculation
        SELECT id INTO trade_id 
        FROM trades 
        WHERE user_id = user_record.user_id 
        ORDER BY created_at ASC 
        LIMIT 1;
        
        -- Trigger recalculation by updating a dummy field
        UPDATE trades 
        SET updated_at = updated_at 
        WHERE id = trade_id;
    END LOOP;
END $$;

-- 6. Mostrar estado final
SELECT 
    'ESTADÍSTICAS FINALES:' as info,
    p.username,
    p.account_balance as balance_inicial,
    us.current_balance,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    us.win_rate,
    us.total_pnl_percentage
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
WHERE us.total_trades > 0
ORDER BY p.created_at DESC; 