-- Script de debug para ver exactamente qué está pasando con los balances

-- 1. Ver si las funciones existen
SELECT 
    'FUNCIONES CREADAS:' as status,
    proname as function_name,
    prosrc as function_exists
FROM pg_proc 
WHERE proname IN ('recalculate_user_stats', 'trigger_recalculate_on_balance_update');

-- 2. Ver si el trigger existe
SELECT 
    'TRIGGER CREADO:' as status,
    tgname as trigger_name,
    tgenabled as trigger_enabled
FROM pg_trigger 
WHERE tgname = 'recalculate_stats_on_balance_update';

-- 3. Ver el estado actual de tu usuario
SELECT 
    'ESTADO ACTUAL:' as status,
    au.id as user_id,
    au.email,
    p.account_balance as balance_inicial_db,
    us.total_trades,
    us.total_pnl_percentage,
    us.total_pnl_money,
    us.current_balance as balance_actual_db,
    us.updated_at as stats_updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE au.email = 'ikerlopezalegre@gmail.com';

-- 4. Ver todos los trades para verificar el cálculo manual
SELECT 
    'TRADES INDIVIDUALES:' as status,
    title,
    result,
    pnl_percentage,
    pnl_pips,
    pnl_money,
    created_at
FROM trades 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com')
ORDER BY created_at;

-- 5. Cálculo manual de verificación
SELECT 
    'CÁLCULO MANUAL:' as status,
    (SELECT account_balance FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com')) as balance_inicial,
    (SELECT SUM(pnl_percentage) FROM trades WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com')) as suma_pnl_percentage,
    (SELECT account_balance FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com')) * 
    (1 + (SELECT COALESCE(SUM(pnl_percentage), 0) FROM trades WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com'))/100) as balance_actual_calculado_manualmente; 