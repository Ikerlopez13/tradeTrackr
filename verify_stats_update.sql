-- Verificar estadísticas actuales del usuario
SELECT 
    'ESTADÍSTICAS EN user_stats' as tipo,
    us.user_id,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    us.win_rate,
    us.total_pnl_percentage,
    us.current_balance,
    us.updated_at
FROM user_stats us
WHERE us.user_id = '4b355234-cce6-419f-bf5c-79c3157540f3'::uuid

UNION ALL

-- Contar trades reales en la base de datos
SELECT 
    'TRADES REALES EN BD' as tipo,
    user_id,
    COUNT(*)::integer as total_trades,
    COUNT(*) FILTER (WHERE result = 'win')::integer as wins,
    COUNT(*) FILTER (WHERE result = 'loss')::integer as losses,
    COUNT(*) FILTER (WHERE result = 'be')::integer as breakevens,
    CASE 
        WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE result = 'win')::NUMERIC / COUNT(*)::NUMERIC * 100)
        ELSE 0 
    END as win_rate,
    COALESCE(SUM(pnl_percentage), 0) as total_pnl_percentage,
    1000 * (1 + COALESCE(SUM(pnl_percentage), 0) / 100) as current_balance_calculated,
    NOW() as updated_at
FROM trades 
WHERE user_id = '4b355234-cce6-419f-bf5c-79c3157540f3'::uuid
GROUP BY user_id;

-- Ver todos los trades actuales para verificar
SELECT 
    title,
    result,
    pnl_percentage,
    created_at
FROM trades 
WHERE user_id = '4b355234-cce6-419f-bf5c-79c3157540f3'::uuid
ORDER BY created_at DESC;

-- Verificar que coincidan los números
-- Si no coinciden, significa que el trigger no está funcionando correctamente 