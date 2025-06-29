-- 🛠️ SCRIPT PARA CREAR EN LOTE TODOS LOS PERFILES FALTANTES
-- ⚠️ EJECUTAR CON CUIDADO - Este script crea perfiles para TODOS los usuarios que no los tengan

-- 1. MOSTRAR USUARIOS QUE SE VAN A PROCESAR
SELECT 
    '📋 USUARIOS QUE SE PROCESARÁN' as "INFO",
    COUNT(*) as "CANTIDAD_A_CREAR"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Ver detalles de los usuarios
SELECT 
    '👤 DETALLES' as "TIPO",
    au.email as "EMAIL",
    au.id as "UUID",
    SPLIT_PART(au.email, '@', 1) as "USERNAME_SUGERIDO",
    au.created_at as "FECHA_REGISTRO"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- 2. CREAR PERFILES FALTANTES
INSERT INTO profiles (id, username, account_balance, is_premium, created_at, updated_at)
SELECT 
    au.id,
    SPLIT_PART(au.email, '@', 1) as username,
    1000.00 as account_balance,  -- Balance inicial estándar
    false as is_premium,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Solo usuarios sin perfil
ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, profiles.username),
    updated_at = NOW();

-- 3. CREAR USER_STATS FALTANTES  
INSERT INTO user_stats (user_id, total_trades, wins, losses, breakevens, winning_trades, losing_trades, break_even_trades, total_pnl_percentage, total_pnl_pips, total_pnl_money, current_balance, updated_at)
SELECT 
    au.id as user_id,
    0 as total_trades,
    0 as wins,
    0 as losses, 
    0 as breakevens,
    0 as winning_trades,
    0 as losing_trades,
    0 as break_even_trades,
    0.00 as total_pnl_percentage,
    0.00 as total_pnl_pips,
    0.00 as total_pnl_money,
    1000.00 as current_balance,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

-- 4. VERIFICAR RESULTADOS
SELECT 
    '✅ VERIFICACIÓN FINAL' as "RESULTADO",
    COUNT(au.id) as "TOTAL_USUARIOS_AUTH",
    COUNT(p.id) as "USUARIOS_CON_PERFIL",
    COUNT(us.user_id) as "USUARIOS_CON_STATS",
    COUNT(au.id) - COUNT(p.id) as "USUARIOS_SIN_PERFIL_RESTANTES"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id;

-- 5. MOSTRAR ÚLTIMOS PERFILES CREADOS
SELECT 
    '🆕 PERFILES RECIÉN CREADOS' as "INFO",
    p.username,
    p.account_balance,
    p.created_at as "FECHA_CREACIÓN_PERFIL",
    au.email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.created_at >= NOW() - INTERVAL '1 hour'  -- Últimos creados en la última hora
ORDER BY p.created_at DESC
LIMIT 10; 