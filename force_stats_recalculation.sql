-- Forzar recálculo de estadísticas para tu usuario
-- Esto actualizará las estadísticas basándose en los trades que realmente existen

WITH calculated_stats AS (
    SELECT 
        '4b355234-cce6-419f-bf5c-79c3157540f3'::uuid as user_id,
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE result = 'win') as wins,
        COUNT(*) FILTER (WHERE result = 'loss') as losses,
        COUNT(*) FILTER (WHERE result = 'be') as breakevens,
        CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE result = 'win')::NUMERIC / COUNT(*)::NUMERIC * 100)
            ELSE 0 
        END as win_rate,
        COALESCE(SUM(pnl_percentage), 0) as total_pnl_percentage,
        1000 * (1 + COALESCE(SUM(pnl_percentage), 0) / 100) as current_balance
    FROM trades 
    WHERE user_id = '4b355234-cce6-419f-bf5c-79c3157540f3'::uuid
)
UPDATE user_stats 
SET 
    total_trades = calculated_stats.total_trades,
    wins = calculated_stats.wins,
    losses = calculated_stats.losses,
    breakevens = calculated_stats.breakevens,
    win_rate = calculated_stats.win_rate,
    total_pnl_percentage = calculated_stats.total_pnl_percentage,
    current_balance = calculated_stats.current_balance,
    updated_at = NOW()
FROM calculated_stats
WHERE user_stats.user_id = calculated_stats.user_id;

-- Verificar el resultado
SELECT 
    'DESPUÉS DEL RECÁLCULO' as estado,
    total_trades,
    wins,
    losses,
    breakevens,
    win_rate,
    total_pnl_percentage,
    current_balance,
    updated_at
FROM user_stats 
WHERE user_id = '4b355234-cce6-419f-bf5c-79c3157540f3'::uuid; 