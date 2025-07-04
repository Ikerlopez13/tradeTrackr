-- Script simple para arreglar las estadísticas del perfil
-- Paso 1: Corregir valores de result y luego recalcular estadísticas

-- 1. Primero corregir los valores de result de mayúsculas a minúsculas
UPDATE trades SET result = 'win' WHERE result = 'Win';
UPDATE trades SET result = 'loss' WHERE result = 'Loss';
UPDATE trades SET result = 'be' WHERE result = 'BE';

-- 2. Verificar que los valores estén correctos
SELECT 
    'VALORES DE RESULT' as titulo,
    result,
    COUNT(*) as cantidad
FROM trades
GROUP BY result
ORDER BY result;

-- 3. Asegurar que las columnas necesarias existen en user_stats
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS breakevens INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_pnl_percentage DECIMAL(10,4) DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_pnl_pips DECIMAL(10,2) DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_pnl_money DECIMAL(15,2) DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS current_balance DECIMAL(15,2) DEFAULT 1000;

-- 4. Recalcular estadísticas manualmente para todos los usuarios
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
    COUNT(CASE WHEN t.result = 'win' THEN 1 END) as wins,
    COUNT(CASE WHEN t.result = 'loss' THEN 1 END) as losses,
    COUNT(CASE WHEN t.result = 'be' THEN 1 END) as breakevens,
    COUNT(CASE WHEN t.result = 'win' THEN 1 END) as winning_trades,
    COUNT(CASE WHEN t.result = 'loss' THEN 1 END) as losing_trades,
    COUNT(CASE WHEN t.result = 'be' THEN 1 END) as break_even_trades,
    COALESCE(SUM(t.pnl_percentage), 0) as total_pnl_percentage,
    COALESCE(SUM(t.pnl_pips), 0) as total_pnl_pips,
    COALESCE(SUM(t.pnl_money), 0) as total_pnl_money,
    COALESCE(p.account_balance, 1000) * (1 + COALESCE(SUM(t.pnl_percentage), 0) / 100) as current_balance,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN t.result = 'win' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
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

-- 5. Verificar que las estadísticas se actualizaron correctamente
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

-- 6. Mostrar usuarios que tienen trades pero no estadísticas
SELECT 
    'USUARIOS SIN ESTADÍSTICAS' as titulo,
    COUNT(DISTINCT t.user_id) as usuarios_con_trades,
    COUNT(DISTINCT us.user_id) as usuarios_con_estadisticas
FROM trades t
LEFT JOIN user_stats us ON t.user_id = us.user_id;

SELECT 'Estadísticas recalculadas exitosamente!' as status; 