-- Script para forzar recálculo inmediato de estadísticas
-- Ejecuta esto si los otros scripts no funcionaron

-- 1. Recálculo directo sin funciones complejas
UPDATE user_stats 
SET 
    current_balance = (
        SELECT p.account_balance * (1 + COALESCE(SUM(t.pnl_percentage), 0)/100)
        FROM profiles p
        LEFT JOIN trades t ON t.user_id = p.id
        WHERE p.id = user_stats.user_id
        GROUP BY p.account_balance
    ),
    total_pnl_percentage = (
        SELECT COALESCE(SUM(pnl_percentage), 0)
        FROM trades 
        WHERE user_id = user_stats.user_id
    ),
    total_pnl_money = (
        SELECT COALESCE(SUM(pnl_money), 0)
        FROM trades 
        WHERE user_id = user_stats.user_id
    ),
    updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ikerlopezalegre@gmail.com');

-- 2. Verificar el resultado
SELECT 
    'DESPUÉS DEL RECÁLCULO FORZADO:' as status,
    au.email,
    p.account_balance as balance_inicial,
    us.total_pnl_percentage as pnl_total,
    us.current_balance as balance_actual,
    (us.current_balance - p.account_balance) as ganancia_perdida,
    us.updated_at
FROM auth.users au
JOIN profiles p ON au.id = p.id
JOIN user_stats us ON au.id = us.user_id
WHERE au.email = 'ikerlopezalegre@gmail.com'; 