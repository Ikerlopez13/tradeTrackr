-- Script para forzar la actualización de estadísticas
-- Este script recalcula manualmente las estadísticas para todos los usuarios

-- 1. Primero, verificar si hay trades
SELECT 
    'VERIFICACIÓN INICIAL' as titulo,
    COUNT(*) as total_trades,
    COUNT(DISTINCT user_id) as usuarios_con_trades
FROM trades;

-- 2. Crear o actualizar estadísticas para todos los usuarios con trades
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
    win_rate,
    updated_at
)
SELECT 
    t.user_id,
    COUNT(*) as total_trades,
    COUNT(CASE WHEN t.result = 'Win' THEN 1 END) as wins,
    COUNT(CASE WHEN t.result = 'Loss' THEN 1 END) as losses,
    COUNT(CASE WHEN t.result = 'BE' THEN 1 END) as breakevens,
    COUNT(CASE WHEN t.result = 'Win' THEN 1 END) as winning_trades,
    COUNT(CASE WHEN t.result = 'Loss' THEN 1 END) as losing_trades,
    COUNT(CASE WHEN t.result = 'BE' THEN 1 END) as break_even_trades,
    COALESCE(SUM(t.pnl_percentage), 0) as total_pnl_percentage,
    COALESCE(SUM(t.pnl_pips), 0) as total_pnl_pips,
    COALESCE(SUM(t.pnl_money), 0) as total_pnl_money,
    COALESCE(p.account_balance, 1000) * (1 + COALESCE(SUM(t.pnl_percentage), 0) / 100) as current_balance,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN t.result = 'Win' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
        ELSE 0 
    END as win_rate,
    NOW() as updated_at
FROM trades t
LEFT JOIN profiles p ON t.user_id = p.id
GROUP BY t.user_id, p.account_balance
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
    win_rate = EXCLUDED.win_rate,
    updated_at = EXCLUDED.updated_at;

-- 3. Verificar que se actualizaron correctamente
SELECT 
    'ESTADÍSTICAS ACTUALIZADAS' as titulo,
    p.username,
    p.email,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    us.win_rate,
    us.total_pnl_percentage,
    us.current_balance,
    us.updated_at
FROM user_stats us
LEFT JOIN profiles p ON us.user_id = p.id
WHERE us.total_trades > 0
ORDER BY us.updated_at DESC;

-- 4. Verificar usuarios sin estadísticas
SELECT 
    'USUARIOS SIN ESTADÍSTICAS' as titulo,
    COUNT(DISTINCT t.user_id) as usuarios_con_trades,
    COUNT(DISTINCT us.user_id) as usuarios_con_estadisticas,
    COUNT(DISTINCT t.user_id) - COUNT(DISTINCT us.user_id) as usuarios_faltantes
FROM trades t
LEFT JOIN user_stats us ON t.user_id = us.user_id;

SELECT 'Actualización de estadísticas completada!' as status; 