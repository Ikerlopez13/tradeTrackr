-- QUERY PARA ARREGLAR P&L (SIN AUTENTICACIÓN)
-- Ejecutar en Supabase SQL Editor

-- ⚠️ IMPORTANTE: Reemplaza 'TU_USER_ID_AQUI' con tu user_id real
-- Para encontrar tu user_id, ejecuta primero este query:

SELECT 
    'TU USER_ID ES:' as info,
    id as user_id,
    email
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Una vez que tengas tu user_id, reemplázalo en todas las consultas de abajo:

-- 1. Ver tu balance actual
SELECT 
    'TU BALANCE ACTUAL:' as info,
    COALESCE(account_balance, 1000) as balance
FROM profiles 
WHERE id = 'TU_USER_ID_AQUI';

-- 2. Ver trades que necesitan arreglo
SELECT 
    'TRADES A ARREGLAR:' as info,
    id,
    title,
    pair,
    pnl_percentage,
    pnl_pips,
    pnl_money
FROM trades 
WHERE user_id = 'TU_USER_ID_AQUI'
ORDER BY created_at DESC;

-- 3. ARREGLAR TRADES - Calcular pnl_money y pnl_pips
UPDATE trades 
SET 
    pnl_money = ROUND((
        SELECT COALESCE(account_balance, 1000) * (pnl_percentage / 100.0)
        FROM profiles 
        WHERE id = 'TU_USER_ID_AQUI'
    ) * 100) / 100,
    pnl_pips = CASE 
        WHEN pair IN ('EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD') THEN
            ROUND((
                SELECT COALESCE(account_balance, 1000) * (pnl_percentage / 100.0) / 1.0
                FROM profiles 
                WHERE id = 'TU_USER_ID_AQUI'
            ) * 10) / 10
        WHEN pair IN ('USDJPY', 'EURJPY', 'GBPJPY') THEN
            ROUND((
                SELECT COALESCE(account_balance, 1000) * (pnl_percentage / 100.0) / 0.1
                FROM profiles 
                WHERE id = 'TU_USER_ID_AQUI'
            ) * 10) / 10
        WHEN pair = 'XAUUSD' THEN
            ROUND((
                SELECT COALESCE(account_balance, 1000) * (pnl_percentage / 100.0) / 10.0
                FROM profiles 
                WHERE id = 'TU_USER_ID_AQUI'
            ) * 10) / 10
        ELSE
            ROUND((
                SELECT COALESCE(account_balance, 1000) * (pnl_percentage / 100.0) / 1.0
                FROM profiles 
                WHERE id = 'TU_USER_ID_AQUI'
            ) * 10) / 10
    END
WHERE user_id = 'TU_USER_ID_AQUI'
AND pnl_percentage IS NOT NULL;

-- 4. ARREGLAR USER_STATS - Recalcular totales
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
    'TU_USER_ID_AQUI',
    COUNT(*),
    COUNT(*) FILTER (WHERE result = 'win'),
    COUNT(*) FILTER (WHERE result = 'loss'),
    COUNT(*) FILTER (WHERE result = 'be'),
    CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE result = 'win')::DECIMAL / COUNT(*)::DECIMAL) * 100)
        ELSE 0 
    END,
    ROUND(COALESCE(SUM(pnl_percentage), 0) * 100) / 100,
    ROUND(COALESCE(SUM(pnl_pips), 0) * 10) / 10,
    ROUND(COALESCE(SUM(pnl_money), 0) * 100) / 100,
    (SELECT COALESCE(account_balance, 1000) FROM profiles WHERE id = 'TU_USER_ID_AQUI') + COALESCE(SUM(pnl_money), 0),
    NOW()
FROM trades 
WHERE user_id = 'TU_USER_ID_AQUI'
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

-- 5. VERIFICAR RESULTADO
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
    current_balance
FROM user_stats 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 6. VER TRADES ACTUALIZADOS
SELECT 
    'TRADES ACTUALIZADOS:' as info,
    title,
    pair,
    pnl_percentage,
    pnl_pips,
    pnl_money
FROM trades 
WHERE user_id = 'TU_USER_ID_AQUI'
ORDER BY created_at DESC; 