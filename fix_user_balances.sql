-- Script para corregir los balances reales de usuarios y actualizar el sistema de leaderboards
-- El problema es que todos muestran 1000€ en lugar de sus balances reales

SELECT '=== DIAGNÓSTICO DE BALANCES REALES ===' as titulo;

-- 1. Verificar estado actual de usuarios y sus balances
SELECT 
    '1. Estado actual de usuarios:' as seccion,
    p.username,
    p.account_balance as balance_inicial_perfil,
    us.current_balance as balance_actual_stats,
    us.total_trades,
    us.total_pnl_percentage,
    us.updated_at as ultima_actualizacion
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
ORDER BY p.username;

-- 2. Verificar trades reales para calcular balance correcto
SELECT 
    '2. Trades por usuario:' as seccion,
    p.username,
    COUNT(t.id) as total_trades_reales,
    SUM(CASE WHEN t.result = 'win' THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN t.result = 'loss' THEN 1 ELSE 0 END) as losses,
    SUM(COALESCE(t.pnl_percentage, 0)) as pnl_total_percentage,
    SUM(COALESCE(t.pnl_money, 0)) as pnl_total_dinero
FROM profiles p
LEFT JOIN trades t ON p.id = t.user_id
GROUP BY p.id, p.username
ORDER BY p.username;

-- 3. CORRECCIÓN: Actualizar balances reales basados en trades
-- Primero, actualizar el balance inicial del perfil si es necesario
UPDATE profiles 
SET account_balance = CASE 
    WHEN username = 'lopezalegreiker' THEN 1280.00
    WHEN account_balance IS NULL OR account_balance = 0 THEN 1000.00
    ELSE account_balance
END;

-- 4. Recalcular user_stats con datos reales
-- Primero, eliminar estadísticas incorrectas
DELETE FROM user_stats WHERE current_balance = 1000 AND total_trades = 0;

-- 5. Recrear user_stats con cálculos correctos basados en trades reales
INSERT INTO user_stats (
    user_id, 
    total_trades, 
    wins, 
    losses, 
    breakevens,
    total_pnl_percentage, 
    current_balance, 
    updated_at
)
SELECT 
    p.id as user_id,
    COALESCE(trade_stats.total_trades, 0) as total_trades,
    COALESCE(trade_stats.wins, 0) as wins,
    COALESCE(trade_stats.losses, 0) as losses,
    COALESCE(trade_stats.breakevens, 0) as breakevens,
    COALESCE(trade_stats.total_pnl_percentage, 0) as total_pnl_percentage,
    -- Calcular balance actual: balance inicial + ganancias/pérdidas
    p.account_balance + COALESCE(trade_stats.total_pnl_money, 0) as current_balance,
    NOW() as updated_at
FROM profiles p
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_trades,
        SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN result = 'breakeven' THEN 1 ELSE 0 END) as breakevens,
        SUM(COALESCE(pnl_percentage, 0)) as total_pnl_percentage,
        SUM(COALESCE(pnl_money, 0)) as total_pnl_money
    FROM trades 
    GROUP BY user_id
) trade_stats ON p.id = trade_stats.user_id
ON CONFLICT (user_id) DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    breakevens = EXCLUDED.breakevens,
    total_pnl_percentage = EXCLUDED.total_pnl_percentage,
    current_balance = EXCLUDED.current_balance,
    updated_at = EXCLUDED.updated_at;

-- 6. Verificar que los balances se han actualizado correctamente
SELECT 
    '6. Balances después de la corrección:' as seccion,
    p.username,
    p.account_balance as balance_inicial,
    us.current_balance as balance_actual,
    us.total_trades,
    us.total_pnl_percentage,
    ROUND(((us.current_balance - p.account_balance) / p.account_balance) * 100, 2) as return_percentage_real
FROM profiles p
JOIN user_stats us ON p.id = us.user_id
ORDER BY us.current_balance DESC;

-- 7. Recrear las vistas de leaderboard para usar los datos corregidos
DROP VIEW IF EXISTS global_leaderboard CASCADE;
CREATE VIEW global_leaderboard AS
SELECT 
    us.user_id as id,
    p.username,
    p.avatar_url,
    COALESCE(p.is_premium, false) as is_premium,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    CASE 
        WHEN us.total_trades > 0 
        THEN ROUND((us.wins::decimal / us.total_trades::decimal) * 100, 2)
        ELSE 0 
    END as win_rate,
    us.total_pnl_percentage,
    us.current_balance,
    -- Usar balance inicial REAL de cada usuario
    CASE 
        WHEN p.account_balance > 0 AND us.current_balance IS NOT NULL
        THEN ROUND(((us.current_balance - p.account_balance) / p.account_balance) * 100, 2)
        ELSE 0 
    END as total_return_percentage,
    p.created_at as user_since,
    -- Rankings por P&L percentage REAL
    ROW_NUMBER() OVER (ORDER BY 
        CASE 
            WHEN p.account_balance > 0 AND us.current_balance IS NOT NULL
            THEN ((us.current_balance - p.account_balance) / p.account_balance) * 100
            ELSE 0 
        END DESC
    ) as pnl_rank,
    ROW_NUMBER() OVER (ORDER BY us.current_balance DESC) as balance_rank,
    ROW_NUMBER() OVER (ORDER BY 
        CASE 
            WHEN us.total_trades > 0 
            THEN (us.wins::decimal / us.total_trades::decimal) * 100
            ELSE 0 
        END DESC
    ) as winrate_rank,
    ROW_NUMBER() OVER (ORDER BY us.total_trades DESC) as volume_rank
FROM user_stats us
JOIN profiles p ON us.user_id = p.id;

-- 8. Recrear vista de grupo también
DROP VIEW IF EXISTS group_leaderboard CASCADE;
CREATE VIEW group_leaderboard AS
SELECT 
    gm.group_id,
    us.user_id as id,
    p.username,
    p.avatar_url,
    COALESCE(p.is_premium, false) as is_premium,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    CASE 
        WHEN us.total_trades > 0 
        THEN ROUND((us.wins::decimal / us.total_trades::decimal) * 100, 2)
        ELSE 0 
    END as win_rate,
    us.total_pnl_percentage,
    us.current_balance,
    CASE 
        WHEN p.account_balance > 0 AND us.current_balance IS NOT NULL
        THEN ROUND(((us.current_balance - p.account_balance) / p.account_balance) * 100, 2)
        ELSE 0 
    END as total_return_percentage,
    p.created_at as user_since,
    ROW_NUMBER() OVER (
        PARTITION BY gm.group_id 
        ORDER BY 
            CASE 
                WHEN p.account_balance > 0 AND us.current_balance IS NOT NULL
                THEN ((us.current_balance - p.account_balance) / p.account_balance) * 100
                ELSE 0 
            END DESC
    ) as group_rank
FROM group_memberships gm
JOIN profiles p ON gm.user_id = p.id
JOIN user_stats us ON gm.user_id = us.user_id;

-- 9. Crear trigger para mantener user_stats actualizado automáticamente
CREATE OR REPLACE FUNCTION update_user_stats_on_trade_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcular estadísticas para el usuario afectado
    INSERT INTO user_stats (
        user_id, 
        total_trades, 
        wins, 
        losses, 
        breakevens,
        total_pnl_percentage, 
        current_balance, 
        updated_at
    )
    SELECT 
        p.id as user_id,
        COALESCE(trade_stats.total_trades, 0) as total_trades,
        COALESCE(trade_stats.wins, 0) as wins,
        COALESCE(trade_stats.losses, 0) as losses,
        COALESCE(trade_stats.breakevens, 0) as breakevens,
        COALESCE(trade_stats.total_pnl_percentage, 0) as total_pnl_percentage,
        p.account_balance + COALESCE(trade_stats.total_pnl_money, 0) as current_balance,
        NOW() as updated_at
    FROM profiles p
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as total_trades,
            SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
            SUM(CASE WHEN result = 'breakeven' THEN 1 ELSE 0 END) as breakevens,
            SUM(COALESCE(pnl_percentage, 0)) as total_pnl_percentage,
            SUM(COALESCE(pnl_money, 0)) as total_pnl_money
        FROM trades 
        WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
        GROUP BY user_id
    ) trade_stats ON p.id = trade_stats.user_id
    WHERE p.id = COALESCE(NEW.user_id, OLD.user_id)
    ON CONFLICT (user_id) DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        breakevens = EXCLUDED.breakevens,
        total_pnl_percentage = EXCLUDED.total_pnl_percentage,
        current_balance = EXCLUDED.current_balance,
        updated_at = EXCLUDED.updated_at;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_insert ON trades;
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_update ON trades;
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_delete ON trades;

CREATE TRIGGER trigger_update_user_stats_on_insert
    AFTER INSERT ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_trade_change();

CREATE TRIGGER trigger_update_user_stats_on_update
    AFTER UPDATE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_trade_change();

CREATE TRIGGER trigger_update_user_stats_on_delete
    AFTER DELETE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_trade_change();

-- 10. Verificación final
SELECT 
    'VERIFICACIÓN FINAL:' as titulo,
    p.username,
    p.account_balance as balance_inicial,
    us.current_balance as balance_actual,
    us.total_trades,
    ROUND(((us.current_balance - p.account_balance) / p.account_balance) * 100, 2) as return_percentage,
    gl.pnl_rank
FROM profiles p
JOIN user_stats us ON p.id = us.user_id
JOIN global_leaderboard gl ON p.id = gl.id
ORDER BY gl.pnl_rank;

SELECT 'Script completado! Los balances ahora reflejan los datos reales de cada usuario.' as status; 