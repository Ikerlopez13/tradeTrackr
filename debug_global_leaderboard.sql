-- Script de diagnóstico para el error del global leaderboard

-- 1. Verificar si la vista global_leaderboard existe
SELECT 
    'Vista global_leaderboard existe:' as check_type,
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'global_leaderboard';

-- 2. Si no existe, verificar si las tablas base existen
SELECT 
    'Tablas necesarias:' as check_type,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('user_stats', 'profiles') 
AND table_schema = 'public';

-- 3. Verificar algunos datos de user_stats
SELECT 
    'Datos en user_stats:' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM user_stats;

-- 4. Verificar algunos datos de profiles
SELECT 
    'Datos en profiles:' as check_type,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as profiles_with_username
FROM profiles;

-- 5. Intentar recrear la vista global_leaderboard si no existe
CREATE OR REPLACE VIEW global_leaderboard AS
SELECT 
    us.user_id as id,
    p.username,
    p.avatar_url,
    p.is_premium,
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
WHERE us.total_trades > 0  -- Solo usuarios con trades
ORDER BY us.current_balance DESC;

-- 6. Verificar que la vista funciona
SELECT 
    'Test de la vista recreada:' as check_type,
    COUNT(*) as total_entries
FROM global_leaderboard;

-- 7. Mostrar algunos datos de ejemplo
SELECT 
    'Datos de ejemplo:' as check_type,
    id,
    username,
    total_trades,
    win_rate,
    current_balance,
    balance_rank
FROM global_leaderboard
ORDER BY balance_rank
LIMIT 5; 