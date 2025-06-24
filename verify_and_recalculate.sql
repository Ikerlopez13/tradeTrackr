-- Script para verificar que el perfil se creó y recalcular con trades reales

-- 1. Verificar que el perfil se creó correctamente
SELECT 
    'PERFIL CREADO:' as status,
    au.id as user_id,
    au.email,
    p.username,
    p.account_balance as balance_inicial,
    p.is_premium,
    us.current_balance as balance_actual_inicial,
    us.total_trades,
    p.created_at as profile_created
FROM auth.users au
JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE au.email = 'ikerlopezalegre@gmail.com';

-- 2. Ver cuántos trades reales tienes
SELECT 
    'TRADES EXISTENTES:' as status,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE result = 'Win') as wins,
    COUNT(*) FILTER (WHERE result = 'Loss') as losses,
    COUNT(*) FILTER (WHERE result = 'BE') as breakevens,
    SUM(pnl_percentage) as total_pnl_percentage,
    SUM(pnl_money) as total_pnl_money
FROM trades 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com');

-- 3. Ahora RECALCULAR las estadísticas con los trades reales
UPDATE user_stats 
SET 
    total_trades = (
        SELECT COUNT(*) 
        FROM trades 
        WHERE user_id = user_stats.user_id
    ),
    wins = (
        SELECT COUNT(*) 
        FROM trades 
        WHERE user_id = user_stats.user_id AND result = 'Win'
    ),
    losses = (
        SELECT COUNT(*) 
        FROM trades 
        WHERE user_id = user_stats.user_id AND result = 'Loss'
    ),
    breakevens = (
        SELECT COUNT(*) 
        FROM trades 
        WHERE user_id = user_stats.user_id AND result = 'BE'
    ),
    total_pnl_percentage = (
        SELECT COALESCE(SUM(pnl_percentage), 0)
        FROM trades 
        WHERE user_id = user_stats.user_id
    ),
    total_pnl_pips = (
        SELECT COALESCE(SUM(pnl_pips), 0)
        FROM trades 
        WHERE user_id = user_stats.user_id
    ),
    total_pnl_money = (
        SELECT COALESCE(SUM(pnl_money), 0)
        FROM trades 
        WHERE user_id = user_stats.user_id
    ),
    current_balance = (
        SELECT p.account_balance * (1 + COALESCE(SUM(t.pnl_percentage), 0)/100)
        FROM profiles p
        LEFT JOIN trades t ON t.user_id = p.id
        WHERE p.id = user_stats.user_id
        GROUP BY p.account_balance
    ),
    updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com');

-- 4. Verificar el resultado final
SELECT 
    'RESULTADO FINAL:' as status,
    au.email,
    p.account_balance as balance_inicial,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    us.total_pnl_percentage as pnl_total_porcentaje,
    us.total_pnl_money as pnl_total_dinero,
    us.current_balance as balance_actual,
    (us.current_balance - p.account_balance) as ganancia_perdida,
    us.updated_at
FROM auth.users au
JOIN profiles p ON au.id = p.id
JOIN user_stats us ON au.id = us.user_id
WHERE au.email = 'ikerlopezalegre@gmail.com';

-- 5. Verificación matemática
SELECT 
    'VERIFICACIÓN MATEMÁTICA:' as status,
    p.account_balance as balance_inicial,
    us.total_pnl_percentage as pnl_porcentaje,
    (p.account_balance * (1 + us.total_pnl_percentage/100)) as balance_calculado,
    us.current_balance as balance_en_bd,
    CASE 
        WHEN ABS((p.account_balance * (1 + us.total_pnl_percentage/100)) - us.current_balance) < 0.01 
        THEN '✅ MATEMÁTICA CORRECTA' 
        ELSE '❌ ERROR EN CÁLCULO' 
    END as verificacion
FROM auth.users au
JOIN profiles p ON au.id = p.id
JOIN user_stats us ON au.id = us.user_id
WHERE au.email = 'ikerlopezalegre@gmail.com'; 