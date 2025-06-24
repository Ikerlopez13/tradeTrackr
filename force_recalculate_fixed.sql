-- Script para forzar el recálculo inmediato del balance del usuario
-- Ejecuta esto en Supabase SQL Editor

-- Obtener el ID del usuario actual
WITH user_info AS (
    SELECT id FROM auth.users LIMIT 1
),
-- Calcular estadísticas actuales
stats_calculation AS (
    SELECT 
        u.id as user_id,
        COALESCE(p.account_balance, 1000) as initial_balance,
        COUNT(t.*) as total_trades,
        COUNT(CASE WHEN t.result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN t.result = 'loss' THEN 1 END) as losses,
        COUNT(CASE WHEN t.result = 'be' THEN 1 END) as breakevens,
        COALESCE(SUM(t.pnl_percentage), 0) as total_pnl_percentage,
        COALESCE(SUM(t.pnl_pips), 0) as total_pnl_pips,
        COALESCE(SUM(t.pnl_money), 0) as total_pnl_money
    FROM user_info u
    LEFT JOIN profiles p ON p.id = u.id
    LEFT JOIN trades t ON t.user_id = u.id
    GROUP BY u.id, p.account_balance
),
-- Calcular balance actual
balance_calculation AS (
    SELECT 
        *,
        initial_balance * (1 + total_pnl_percentage / 100) as current_balance
    FROM stats_calculation
)
-- Actualizar user_stats con los valores correctos
INSERT INTO user_stats (
    user_id,
    total_trades,
    wins,
    losses,
    breakevens,
    winning_trades,
    losing_trades,
    break_even_trades,
    total_pnl_percentage,
    total_pnl_pips,
    total_pnl_money,
    current_balance,
    updated_at
)
SELECT 
    user_id,
    total_trades,
    wins,
    losses,
    breakevens,
    wins as winning_trades,
    losses as losing_trades,
    breakevens as break_even_trades,
    total_pnl_percentage,
    total_pnl_pips,
    total_pnl_money,
    current_balance,
    NOW()
FROM balance_calculation
ON CONFLICT (user_id) 
DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    breakevens = EXCLUDED.breakevens,
    winning_trades = EXCLUDED.winning_trades,
    losing_trades = EXCLUDED.losing_trades,
    break_even_trades = EXCLUDED.break_even_trades,
    total_pnl_percentage = EXCLUDED.total_pnl_percentage,
    total_pnl_pips = EXCLUDED.total_pnl_pips,
    total_pnl_money = EXCLUDED.total_pnl_money,
    current_balance = EXCLUDED.current_balance,
    updated_at = EXCLUDED.updated_at;

-- Verificar el resultado
SELECT 
    'BALANCE ACTUALIZADO CORRECTAMENTE' as status,
    total_trades,
    wins,
    losses,
    total_pnl_percentage,
    current_balance,
    (current_balance - 1000) as ganancia_perdida,
    CONCAT('$', current_balance, ' = $1000 × (1 + ', total_pnl_percentage, '%)') as formula
FROM user_stats 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1); 