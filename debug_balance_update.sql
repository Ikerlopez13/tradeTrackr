-- Script para verificar y arreglar el cálculo de balance
-- Primero vemos el estado actual
SELECT 
    p.id,
    p.email,
    p.account_balance as balance_inicial,
    us.total_trades,
    us.total_pnl_percentage,
    us.total_pnl_money,
    us.current_balance,
    us.updated_at
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
WHERE p.email = 'ikerlopezalegre@gmail.com';

-- Ver los trades individuales para verificar el cálculo
SELECT 
    title,
    result,
    pnl_percentage,
    pnl_pips,
    pnl_money,
    created_at
FROM trades 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'ikerlopezalegre@gmail.com')
ORDER BY created_at;
