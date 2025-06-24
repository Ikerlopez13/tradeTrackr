-- Script simple para actualizar solo el balance actual
-- Ejecuta esto después de agregar la columna updated_at

-- Paso 1: Calcular y actualizar el balance actual
UPDATE user_stats 
SET current_balance = (
    SELECT 
        COALESCE(p.account_balance, 1000) * (1 + COALESCE(SUM(t.pnl_percentage), 0) / 100)
    FROM profiles p
    LEFT JOIN trades t ON t.user_id = p.id
    WHERE p.id = user_stats.user_id
    GROUP BY p.id, p.account_balance
),
updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- Paso 2: Verificar el resultado
SELECT 
    'BALANCE ACTUALIZADO' as status,
    user_id,
    total_trades,
    wins,
    losses,
    total_pnl_percentage,
    current_balance,
    (current_balance - 1000) as ganancia_perdida,
    updated_at
FROM user_stats 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1); 