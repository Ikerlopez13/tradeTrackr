-- Script para recalcular P&L en pips y dinero basándose en porcentajes existentes
-- Ejecutar en Supabase SQL Editor

-- 1. Primero ver qué trades necesitan recálculo
SELECT 
    'TRADES QUE NECESITAN RECÁLCULO:' as info,
    id,
    title,
    pair,
    pnl_percentage,
    pnl_pips,
    pnl_money,
    created_at
FROM trades 
WHERE user_id = auth.uid()
AND pnl_percentage IS NOT NULL
AND (pnl_pips IS NULL OR pnl_money IS NULL OR pnl_pips = 0 OR pnl_money = 0)
ORDER BY created_at DESC;

-- 2. Función para calcular valor por pip
CREATE OR REPLACE FUNCTION get_pip_value(pair_name TEXT, account_balance NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
    lot_size NUMERIC;
BEGIN
    -- Determinar tamaño de lote según balance
    IF account_balance >= 10000 THEN
        lot_size := 100000; -- Lote estándar
    ELSIF account_balance >= 1000 THEN
        lot_size := 10000;  -- Mini lote
    ELSE
        lot_size := 1000;   -- Micro lote
    END IF;
    
    -- Calcular valor por pip según el tipo de par
    CASE 
        -- Pares con JPY
        WHEN pair_name IN ('USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY') THEN
            RETURN (lot_size * 0.01) / 100;
        
        -- Pares mayores
        WHEN pair_name IN ('EURUSD', 'GBPUSD', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD') THEN
            RETURN (lot_size * 0.0001) / 10;
        
        -- Metales preciosos
        WHEN pair_name = 'XAUUSD' THEN
            RETURN lot_size * 0.01 / 100;
        WHEN pair_name = 'XAGUSD' THEN
            RETURN lot_size * 0.001 / 100;
        WHEN pair_name IN ('XPTUSD', 'XPDUSD') THEN
            RETURN lot_size * 0.001 / 100;
        
        -- Índices
        WHEN pair_name IN ('US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'JPN225') THEN
            RETURN lot_size * 0.1 / 100;
        
        -- Valor por defecto para otros pares
        ELSE
            RETURN (lot_size * 0.0001) / 10;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 3. Obtener balance del usuario
WITH user_balance AS (
    SELECT COALESCE(account_balance, 1000) as balance
    FROM profiles 
    WHERE id = auth.uid()
)
-- 4. Actualizar trades con P&L calculado
UPDATE trades 
SET 
    pnl_money = ROUND((ub.balance * (pnl_percentage / 100.0)) * 100) / 100,
    pnl_pips = CASE 
        WHEN get_pip_value(pair, ub.balance) > 0 THEN
            ROUND(((ub.balance * (pnl_percentage / 100.0)) / get_pip_value(pair, ub.balance)) * 10) / 10
        ELSE NULL
    END
FROM user_balance ub
WHERE trades.user_id = auth.uid()
AND trades.pnl_percentage IS NOT NULL
AND (trades.pnl_pips IS NULL OR trades.pnl_money IS NULL OR trades.pnl_pips = 0 OR trades.pnl_money = 0);

-- 5. Actualizar estadísticas en user_stats
WITH calculated_totals AS (
    SELECT 
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE result = 'win') as wins,
        COUNT(*) FILTER (WHERE result = 'loss') as losses,
        COUNT(*) FILTER (WHERE result = 'be') as breakevens,
        COALESCE(SUM(pnl_percentage), 0) as total_pnl_percentage,
        COALESCE(SUM(pnl_pips), 0) as total_pnl_pips,
        COALESCE(SUM(pnl_money), 0) as total_pnl_money
    FROM trades 
    WHERE user_id = auth.uid()
),
user_balance AS (
    SELECT COALESCE(account_balance, 1000) as balance
    FROM profiles 
    WHERE id = auth.uid()
)
INSERT INTO user_stats (
    user_id,
    total_trades,
    wins,
    losses,
    breakevens,
    win_rate,
    total_pnl_percentage,
    total_pnl_pips,
    total_pnl_money,
    current_balance,
    updated_at
)
SELECT 
    auth.uid(),
    ct.total_trades,
    ct.wins,
    ct.losses,
    ct.breakevens,
    CASE 
        WHEN ct.total_trades > 0 THEN ROUND((ct.wins::DECIMAL / ct.total_trades::DECIMAL) * 100)
        ELSE 0 
    END as win_rate,
    ROUND(ct.total_pnl_percentage * 100) / 100,
    ROUND(ct.total_pnl_pips * 10) / 10,
    ROUND(ct.total_pnl_money * 100) / 100,
    ub.balance + ct.total_pnl_money,
    NOW()
FROM calculated_totals ct, user_balance ub
ON CONFLICT (user_id) 
DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    breakevens = EXCLUDED.breakevens,
    win_rate = EXCLUDED.win_rate,
    total_pnl_percentage = EXCLUDED.total_pnl_percentage,
    total_pnl_pips = EXCLUDED.total_pnl_pips,
    total_pnl_money = EXCLUDED.total_pnl_money,
    current_balance = EXCLUDED.current_balance,
    updated_at = EXCLUDED.updated_at;

-- 6. Verificar resultado
SELECT 
    'RESULTADO FINAL:' as info,
    total_trades,
    wins,
    losses,
    breakevens,
    win_rate,
    total_pnl_percentage,
    total_pnl_pips,
    total_pnl_money,
    current_balance,
    updated_at
FROM user_stats 
WHERE user_id = auth.uid();

-- 7. Ver trades actualizados
SELECT 
    'TRADES ACTUALIZADOS:' as info,
    id,
    title,
    pair,
    pnl_percentage,
    pnl_pips,
    pnl_money,
    created_at
FROM trades 
WHERE user_id = auth.uid()
AND pnl_percentage IS NOT NULL
ORDER BY created_at DESC;

-- 8. Limpiar función temporal
DROP FUNCTION IF EXISTS get_pip_value(TEXT, NUMERIC); 