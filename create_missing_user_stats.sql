-- Crear registros faltantes en user_stats para usuarios existentes
INSERT INTO user_stats (user_id, total_trades, winning_trades, losing_trades, break_even_trades, win_rate, last_updated)
SELECT 
    id as user_id,
    0 as total_trades,
    0 as winning_trades, 
    0 as losing_trades,
    0 as break_even_trades,
    0 as win_rate,
    NOW() as last_updated
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_stats); 