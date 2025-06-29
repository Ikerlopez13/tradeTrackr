-- Script para crear/recrear todas las vistas necesarias para los leaderboards

-- 1. Recrear vista global_leaderboard
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
    us.total_return_percentage,
    p.created_at as user_since,
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
JOIN profiles p ON us.user_id = p.id
WHERE us.total_trades > 0;

-- 2. Recrear vista group_leaderboard (si no existe)
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
    COALESCE(us.current_balance, 10000) as current_balance,
    COALESCE(us.total_return_percentage, 0) as total_return_percentage,
    p.created_at as user_since,
    ROW_NUMBER() OVER (
        PARTITION BY gm.group_id 
        ORDER BY COALESCE(us.current_balance, 10000) DESC
    ) as group_rank
FROM group_memberships gm
JOIN profiles p ON gm.user_id = p.id
LEFT JOIN user_stats us ON gm.user_id = us.user_id;

-- 3. Habilitar RLS en las vistas (si es necesario)
-- Las vistas heredan las políticas RLS de las tablas base

-- 4. Verificar que las vistas funcionan
SELECT 'Global leaderboard test:' as test, COUNT(*) as count FROM global_leaderboard;
SELECT 'Group leaderboard test:' as test, COUNT(*) as count FROM group_leaderboard;

-- 5. Mostrar algunos datos de ejemplo
SELECT 
    'Global leaderboard sample:' as sample,
    username,
    total_trades,
    win_rate,
    current_balance,
    balance_rank
FROM global_leaderboard
ORDER BY balance_rank
LIMIT 3;

SELECT 'Script completado exitosamente!' as status; 