-- Script para crear el perfil faltante del usuario

-- 1. Verificar si el usuario existe en auth.users pero no en profiles
SELECT 
    'DIAGNÓSTICO:' as status,
    au.id as user_id,
    au.email,
    CASE WHEN p.id IS NULL THEN '❌ FALTA PERFIL' ELSE '✅ PERFIL EXISTE' END as profile_status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'ikerlopezalegre@gmail.com';

-- 2. Crear el perfil faltante con balance inicial de $1280 (como tienes en la app)
INSERT INTO profiles (id, username, account_balance, is_premium, created_at, updated_at)
SELECT 
    au.id,
    SPLIT_PART(au.email, '@', 1) as username, -- usar parte antes del @ como username
    1280.00 as account_balance, -- el balance que tienes en la app
    false as is_premium,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
WHERE au.email = 'ikerlopezalegre@gmail.com'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = au.id);

-- 3. Crear el registro de estadísticas inicial
INSERT INTO user_stats (user_id, total_trades, wins, losses, breakevens, total_pnl_percentage, total_pnl_pips, total_pnl_money, current_balance, updated_at)
SELECT 
    au.id as user_id,
    0 as total_trades,
    0 as wins, 
    0 as losses,
    0 as breakevens,
    0.00 as total_pnl_percentage,
    0.00 as total_pnl_pips,
    0.00 as total_pnl_money,
    1280.00 as current_balance, -- mismo que account_balance inicial
    NOW() as updated_at
FROM auth.users au
WHERE au.email = 'ikerlopezalegre@gmail.com'
AND NOT EXISTS (SELECT 1 FROM user_stats WHERE user_id = au.id);

-- 4. Verificar que todo se creó correctamente
SELECT 
    'DESPUÉS DE CREAR PERFIL:' as status,
    au.id as user_id,
    au.email,
    p.username,
    p.account_balance as balance_inicial,
    p.is_premium,
    us.current_balance as balance_actual,
    us.total_trades,
    p.created_at as profile_created
FROM auth.users au
JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE au.email = 'ikerlopezalegre@gmail.com'; 