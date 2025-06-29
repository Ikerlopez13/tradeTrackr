-- Script corregido para crear/recrear todas las vistas necesarias para los leaderboards
-- CON el balance inicial REAL de cada usuario desde profiles.account_balance
-- CON ranking optimizado por P&L percentage

-- DIAGNÓSTICO INICIAL: Verificar estado actual de la base de datos
SELECT '=== DIAGNÓSTICO INICIAL ===' as info;

-- Verificar usuarios y sus balances
SELECT 
    'Usuarios y balances:' as info,
    p.id,
    p.username,
    p.account_balance as balance_inicial,
    us.current_balance as balance_actual,
    us.total_trades,
    us.total_pnl_percentage
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
ORDER BY p.created_at DESC
LIMIT 10;

-- Verificar si hay trades
SELECT 
    'Total de trades en sistema:' as info,
    COUNT(*) as total_trades,
    COUNT(DISTINCT user_id) as usuarios_con_trades
FROM trades;

-- Verificar user_stats
SELECT 
    'Estadísticas de usuarios:' as info,
    COUNT(*) as total_user_stats,
    AVG(current_balance) as promedio_balance,
    MIN(current_balance) as min_balance,
    MAX(current_balance) as max_balance
FROM user_stats;

SELECT '=== FIN DIAGNÓSTICO ===' as info;

-- 1. Recrear vista global_leaderboard (usando balance inicial real)
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
    -- Calculamos total_return_percentage basado en el balance inicial REAL del usuario
    CASE 
        WHEN COALESCE(p.account_balance, 1000) > 0 AND us.current_balance IS NOT NULL
        THEN ROUND(((us.current_balance - COALESCE(p.account_balance, 1000)) / COALESCE(p.account_balance, 1000)) * 100, 2)
        ELSE 0 
    END as total_return_percentage,
    p.created_at as user_since,
    -- Rankings optimizados por P&L percentage REAL
    ROW_NUMBER() OVER (ORDER BY 
        CASE 
            WHEN COALESCE(p.account_balance, 1000) > 0 AND us.current_balance IS NOT NULL
            THEN ((us.current_balance - COALESCE(p.account_balance, 1000)) / COALESCE(p.account_balance, 1000)) * 100
            ELSE 0 
        END DESC
    ) as pnl_rank,
    ROW_NUMBER() OVER (ORDER BY COALESCE(us.current_balance, 0) DESC) as balance_rank,
    ROW_NUMBER() OVER (ORDER BY 
        CASE 
            WHEN us.total_trades > 0 
            THEN (us.wins::decimal / us.total_trades::decimal) * 100
            ELSE 0 
        END DESC
    ) as winrate_rank,
    ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_trades, 0) DESC) as volume_rank
FROM user_stats us
JOIN profiles p ON us.user_id = p.id
WHERE us.total_trades > 0;

-- 2. Recrear vista group_leaderboard (usando balance inicial real)
DROP VIEW IF EXISTS group_leaderboard CASCADE;
CREATE VIEW group_leaderboard AS
SELECT 
    gm.group_id,
    us.user_id as id,
    p.username,
    p.avatar_url,
    COALESCE(p.is_premium, false) as is_premium,
    COALESCE(us.total_trades, 0) as total_trades,
    COALESCE(us.wins, 0) as wins,
    COALESCE(us.losses, 0) as losses,
    COALESCE(us.breakevens, 0) as breakevens,
    CASE 
        WHEN COALESCE(us.total_trades, 0) > 0 
        THEN ROUND((COALESCE(us.wins, 0)::decimal / us.total_trades::decimal) * 100, 2)
        ELSE 0 
    END as win_rate,
    COALESCE(us.total_pnl_percentage, 0) as total_pnl_percentage,
    COALESCE(us.current_balance, COALESCE(p.account_balance, 1000)) as current_balance,
    -- Calculamos total_return_percentage basado en el balance inicial REAL del usuario
    CASE 
        WHEN COALESCE(p.account_balance, 1000) > 0 AND us.current_balance IS NOT NULL
        THEN ROUND(((COALESCE(us.current_balance, COALESCE(p.account_balance, 1000)) - COALESCE(p.account_balance, 1000)) / COALESCE(p.account_balance, 1000)) * 100, 2)
        ELSE 0 
    END as total_return_percentage,
    p.created_at as user_since,
    -- Ranking dentro del grupo por P&L percentage REAL
    ROW_NUMBER() OVER (
        PARTITION BY gm.group_id 
        ORDER BY 
            CASE 
                WHEN COALESCE(p.account_balance, 1000) > 0 AND us.current_balance IS NOT NULL
                THEN ((COALESCE(us.current_balance, COALESCE(p.account_balance, 1000)) - COALESCE(p.account_balance, 1000)) / COALESCE(p.account_balance, 1000)) * 100
                ELSE 0 
            END DESC
    ) as group_rank
FROM group_memberships gm
JOIN profiles p ON gm.user_id = p.id
LEFT JOIN user_stats us ON gm.user_id = us.user_id;

-- 3. Verificar que las vistas funcionan
SELECT 'Global leaderboard test:' as test, COUNT(*) as count FROM global_leaderboard;
SELECT 'Group leaderboard test:' as test, COUNT(*) as count FROM group_leaderboard;

-- 4. Mostrar algunos datos de ejemplo ordenados por P&L percentage REAL
SELECT 
    'Global leaderboard sample (by REAL P&L %):' as sample,
    username,
    total_trades,
    win_rate,
    current_balance,
    total_return_percentage,
    pnl_rank,
    balance_rank
FROM global_leaderboard
ORDER BY total_return_percentage DESC
LIMIT 5;

-- 5. Mostrar balance inicial vs actual para verificar
SELECT 
    'Balance verification:' as info,
    p.username,
    p.account_balance as balance_inicial,
    us.current_balance as balance_actual,
    us.total_pnl_percentage as pnl_acumulado,
    ROUND(((us.current_balance - COALESCE(p.account_balance, 1000)) / COALESCE(p.account_balance, 1000)) * 100, 2) as return_percentage_calculado
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
WHERE us.total_trades > 0
ORDER BY return_percentage_calculado DESC
LIMIT 5;

-- 6. DIAGNÓSTICO FINAL: Si todos tienen balance 0, crear datos de ejemplo
DO $$
DECLARE
    user_count INTEGER;
    stats_count INTEGER;
BEGIN
    -- Contar usuarios y estadísticas
    SELECT COUNT(*) INTO user_count FROM profiles;
    SELECT COUNT(*) INTO stats_count FROM user_stats WHERE current_balance > 0;
    
    RAISE NOTICE 'Usuarios totales: %, Usuarios con balance > 0: %', user_count, stats_count;
    
    -- Si no hay estadísticas válidas, crear datos de ejemplo
    IF stats_count = 0 AND user_count > 0 THEN
        RAISE NOTICE 'Creando datos de ejemplo para testing...';
        
        -- Actualizar balance inicial de usuarios existentes
        UPDATE profiles 
        SET account_balance = CASE 
            WHEN account_balance IS NULL OR account_balance = 0 THEN 1000.00
            ELSE account_balance
        END;
        
        -- Crear estadísticas de ejemplo para usuarios sin trades
        INSERT INTO user_stats (
            user_id, total_trades, wins, losses, breakevens,
            total_pnl_percentage, current_balance, updated_at
        )
        SELECT 
            p.id,
            0 as total_trades,
            0 as wins,
            0 as losses, 
            0 as breakevens,
            0.00 as total_pnl_percentage,
            COALESCE(p.account_balance, 1000.00) as current_balance,
            NOW()
        FROM profiles p
        WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE user_id = p.id)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Datos de ejemplo creados.';
    END IF;
END $$;

SELECT 'Script completado exitosamente! Ahora usa el balance inicial REAL de cada usuario.' as status; 