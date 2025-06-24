-- Script para arreglar el problema de user_id diferente

-- 1. Identificar los dos user_ids
SELECT 
    'USER_IDS IDENTIFICADOS:' as status,
    'ACTUAL (con email)' as tipo,
    au.id as user_id,
    au.email
FROM auth.users au
WHERE au.email = 'ikerlopezalegre@gmail.com'

UNION ALL

SELECT 
    'USER_IDS IDENTIFICADOS:' as status,
    'VIEJO (con trades)' as tipo,
    '4b355234-cce6-419f-bf5c-79c3157540f3'::uuid as user_id,
    'SIN EMAIL' as email;

-- 2. Ver los datos del user_id viejo (con trades)
SELECT 
    'DATOS DEL USER_ID VIEJO:' as status,
    us.user_id,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    us.total_pnl_percentage,
    us.current_balance,
    us.updated_at
FROM user_stats us
WHERE us.user_id = '4b355234-cce6-419f-bf5c-79c3157540f3';

-- 3. Ver los trades del user_id viejo
SELECT 
    'TRADES DEL USER_ID VIEJO:' as status,
    COUNT(*) as total_trades,
    SUM(pnl_percentage) as total_pnl_percentage,
    SUM(pnl_money) as total_pnl_money
FROM trades 
WHERE user_id = '4b355234-cce6-419f-bf5c-79c3157540f3';

-- 4. TRANSFERIR todos los trades al user_id correcto
UPDATE trades 
SET user_id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com')
WHERE user_id = '4b355234-cce6-419f-bf5c-79c3157540f3';

-- 5. ELIMINAR las estadísticas del user_id viejo
DELETE FROM user_stats 
WHERE user_id = '4b355234-cce6-419f-bf5c-79c3157540f3';

-- 6. RECALCULAR las estadísticas para tu user_id correcto
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

-- 7. VERIFICAR el resultado final
SELECT 
    'RESULTADO FINAL CORREGIDO:' as status,
    au.email,
    p.account_balance as balance_inicial,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    us.total_pnl_percentage as pnl_porcentaje,
    us.current_balance as balance_actual,
    (us.current_balance - p.account_balance) as ganancia_perdida,
    us.updated_at
FROM auth.users au
JOIN profiles p ON au.id = p.id
JOIN user_stats us ON au.id = us.user_id
WHERE au.email = 'ikerlopezalegre@gmail.com'; 