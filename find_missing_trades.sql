-- Script para encontrar los trades que faltan

-- 1. Buscar TODOS los trades en la tabla (sin filtrar por usuario)
SELECT 
    'TODOS LOS TRADES EN LA BD:' as status,
    COUNT(*) as total_trades_en_bd
FROM trades;

-- 2. Ver los últimos 10 trades creados (cualquier usuario)
SELECT 
    'ÚLTIMOS TRADES CREADOS:' as status,
    id,
    user_id,
    title,
    result,
    pnl_percentage,
    pnl_money,
    created_at
FROM trades 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Ver si hay trades con user_id NULL o diferente
SELECT 
    'TRADES POR USER_ID:' as status,
    user_id,
    COUNT(*) as cantidad_trades
FROM trades 
GROUP BY user_id
ORDER BY cantidad_trades DESC;

-- 4. Buscar tu user_id específico
SELECT 
    'TU USER_ID:' as status,
    au.id as tu_user_id,
    au.email
FROM auth.users au
WHERE au.email = 'ikerlopezalegre@gmail.com';

-- 5. Buscar trades que podrían ser tuyos (por título o fecha reciente)
SELECT 
    'TRADES RECIENTES (cualquier usuario):' as status,
    user_id,
    title,
    result,
    pnl_percentage,
    pnl_money,
    created_at,
    CASE 
        WHEN user_id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com') 
        THEN '✅ ES TUYO' 
        ELSE '❌ DE OTRO USUARIO' 
    END as es_tuyo
FROM trades 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 6. Verificar si hay algún problema con user_stats
SELECT 
    'TODAS LAS USER_STATS:' as status,
    us.user_id,
    us.total_trades,
    us.current_balance,
    us.updated_at,
    CASE 
        WHEN us.user_id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com') 
        THEN '✅ TUS STATS' 
        ELSE '❌ DE OTRO USUARIO' 
    END as es_tuyo
FROM user_stats us
ORDER BY us.updated_at DESC; 