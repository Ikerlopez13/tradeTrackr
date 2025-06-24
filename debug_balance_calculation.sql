-- Script de debug para entender por qué el balance se calcula mal
-- Ejecuta esto en Supabase SQL Editor para ver qué está pasando

-- 1. Ver los datos del perfil del usuario
SELECT 
    id,
    email,
    account_balance,
    created_at
FROM auth.users 
LIMIT 1;

-- 2. Ver todos los trades del usuario y sus valores P&L
SELECT 
    title,
    result,
    pnl_percentage,
    pnl_pips,
    pnl_money,
    created_at
FROM trades 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY created_at;

-- 3. Ver el cálculo paso a paso
WITH user_data AS (
    SELECT id FROM auth.users LIMIT 1
),
profile_data AS (
    SELECT 
        account_balance,
        COALESCE(account_balance, 1000) as initial_balance
    FROM profiles 
    WHERE id = (SELECT id FROM user_data)
),
trade_calculations AS (
    SELECT 
        COUNT(*) as total_trades,
        COUNT(CASE WHEN result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN result = 'loss' THEN 1 END) as losses,
        COUNT(CASE WHEN result = 'be' THEN 1 END) as breakevens,
        SUM(pnl_percentage) as sum_pnl_percentage,
        SUM(pnl_pips) as sum_pnl_pips,
        SUM(pnl_money) as sum_pnl_money,
        COALESCE(SUM(pnl_percentage), 0) as total_pnl_percentage
    FROM trades 
    WHERE user_id = (SELECT id FROM user_data)
)
SELECT 
    'DATOS DE PERFIL' as seccion,
    p.account_balance as balance_en_perfil,
    p.initial_balance as balance_inicial_usado,
    NULL::DECIMAL as total_trades,
    NULL::DECIMAL as total_pnl_percentage,
    NULL::DECIMAL as balance_calculado,
    NULL::TEXT as formula_aplicada
FROM profile_data p

UNION ALL

SELECT 
    'DATOS DE TRADES' as seccion,
    NULL as balance_en_perfil,
    NULL as balance_inicial_usado,
    t.total_trades::DECIMAL,
    t.total_pnl_percentage,
    NULL as balance_calculado,
    CONCAT('Suma de P&L: ', t.sum_pnl_percentage, '% (', t.wins, ' wins, ', t.losses, ' losses, ', t.breakevens, ' BE)') as formula_aplicada
FROM trade_calculations t

UNION ALL

SELECT 
    'CÁLCULO FINAL' as seccion,
    NULL as balance_en_perfil,
    p.initial_balance as balance_inicial_usado,
    NULL as total_trades,
    t.total_pnl_percentage,
    p.initial_balance * (1 + t.total_pnl_percentage / 100) as balance_calculado,
    CONCAT(p.initial_balance, ' × (1 + ', t.total_pnl_percentage, '/100) = ', p.initial_balance * (1 + t.total_pnl_percentage / 100)) as formula_aplicada
FROM profile_data p, trade_calculations t;

-- 4. Ver qué hay en user_stats actualmente
SELECT 
    total_trades,
    wins,
    losses,
    breakevens,
    total_pnl_percentage,
    total_pnl_pips,
    total_pnl_money,
    current_balance,
    updated_at
FROM user_stats 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1); 