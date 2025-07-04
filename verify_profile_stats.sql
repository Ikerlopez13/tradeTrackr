-- Script de verificación de estadísticas del perfil
-- Ejecutar después de aplicar fix_profile_statistics.sql

-- 1. Verificar que todas las columnas necesarias existen
SELECT 
    'VERIFICACIÓN DE COLUMNAS' as titulo,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
AND column_name IN ('wins', 'losses', 'breakevens', 'total_pnl_percentage', 'total_pnl_pips', 'total_pnl_money', 'current_balance', 'win_rate')
ORDER BY column_name;

-- 2. Verificar que los triggers están activos
SELECT 
    'VERIFICACIÓN DE TRIGGERS' as titulo,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trades'
AND trigger_name LIKE '%user_stats%';

-- 3. Comparar estadísticas calculadas vs almacenadas
WITH calculated_stats AS (
    SELECT 
        t.user_id,
        p.username,
        p.account_balance as balance_inicial,
        COUNT(*) as trades_calculados,
        COUNT(CASE WHEN t.result = 'Win' THEN 1 END) as wins_calculados,
        COUNT(CASE WHEN t.result = 'Loss' THEN 1 END) as losses_calculados,
        COUNT(CASE WHEN t.result = 'BE' THEN 1 END) as be_calculados,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN t.result = 'Win' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
            ELSE 0 
        END as win_rate_calculado,
        COALESCE(SUM(t.pnl_percentage), 0) as total_pnl_pct_calculado,
        COALESCE(SUM(t.pnl_pips), 0) as total_pnl_pips_calculado,
        COALESCE(SUM(t.pnl_money), 0) as total_pnl_money_calculado,
        p.account_balance * (1 + COALESCE(SUM(t.pnl_percentage), 0) / 100) as balance_calculado
    FROM trades t
    JOIN profiles p ON t.user_id = p.id
    GROUP BY t.user_id, p.username, p.account_balance
),
stored_stats AS (
    SELECT 
        us.user_id,
        us.total_trades as trades_almacenados,
        us.wins as wins_almacenados,
        us.losses as losses_almacenados,
        us.breakevens as be_almacenados,
        us.win_rate as win_rate_almacenado,
        us.total_pnl_percentage as total_pnl_pct_almacenado,
        us.total_pnl_pips as total_pnl_pips_almacenado,
        us.total_pnl_money as total_pnl_money_almacenado,
        us.current_balance as balance_almacenado,
        us.updated_at
    FROM user_stats us
)
SELECT 
    'COMPARACIÓN DE ESTADÍSTICAS' as titulo,
    cs.username,
    cs.balance_inicial,
    -- Trades
    cs.trades_calculados,
    ss.trades_almacenados,
    CASE WHEN cs.trades_calculados = ss.trades_almacenados THEN '✅' ELSE '❌' END as trades_ok,
    -- Wins
    cs.wins_calculados,
    ss.wins_almacenados,
    CASE WHEN cs.wins_calculados = ss.wins_almacenados THEN '✅' ELSE '❌' END as wins_ok,
    -- Losses
    cs.losses_calculados,
    ss.losses_almacenados,
    CASE WHEN cs.losses_calculados = ss.losses_almacenados THEN '✅' ELSE '❌' END as losses_ok,
    -- Win Rate
    cs.win_rate_calculado,
    ss.win_rate_almacenado,
    CASE WHEN ABS(cs.win_rate_calculado - ss.win_rate_almacenado) < 0.1 THEN '✅' ELSE '❌' END as win_rate_ok,
    -- P&L Percentage
    cs.total_pnl_pct_calculado,
    ss.total_pnl_pct_almacenado,
    CASE WHEN ABS(cs.total_pnl_pct_calculado - ss.total_pnl_pct_almacenado) < 0.01 THEN '✅' ELSE '❌' END as pnl_pct_ok,
    -- Balance
    cs.balance_calculado,
    ss.balance_almacenado,
    CASE WHEN ABS(cs.balance_calculado - ss.balance_almacenado) < 0.01 THEN '✅' ELSE '❌' END as balance_ok,
    ss.updated_at
FROM calculated_stats cs
LEFT JOIN stored_stats ss ON cs.user_id = ss.user_id
ORDER BY cs.username;

-- 4. Verificar usuarios sin trades
SELECT 
    'USUARIOS SIN TRADES' as titulo,
    p.username,
    p.account_balance,
    COALESCE(us.total_trades, 0) as trades_registrados,
    COALESCE(us.current_balance, p.account_balance) as balance_actual,
    CASE 
        WHEN us.user_id IS NULL THEN '❌ Sin estadísticas'
        WHEN us.total_trades = 0 THEN '✅ Estadísticas vacías correctas'
        ELSE '⚠️ Revisar'
    END as estado
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
LEFT JOIN trades t ON p.id = t.user_id
WHERE t.user_id IS NULL
ORDER BY p.username;

-- 5. Resumen general
SELECT 
    'RESUMEN GENERAL' as titulo,
    COUNT(DISTINCT p.id) as total_usuarios,
    COUNT(DISTINCT t.user_id) as usuarios_con_trades,
    COUNT(DISTINCT us.user_id) as usuarios_con_estadisticas,
    COUNT(DISTINCT p.id) - COUNT(DISTINCT us.user_id) as usuarios_sin_estadisticas,
    CASE 
        WHEN COUNT(DISTINCT p.id) = COUNT(DISTINCT us.user_id) THEN '✅ Todos los usuarios tienen estadísticas'
        ELSE '❌ Algunos usuarios sin estadísticas'
    END as estado_general
FROM profiles p
LEFT JOIN trades t ON p.id = t.user_id
LEFT JOIN user_stats us ON p.id = us.user_id;

-- 6. Verificar que los valores de result son correctos
SELECT 
    'VERIFICACIÓN DE VALORES RESULT' as titulo,
    result,
    COUNT(*) as cantidad,
    CASE 
        WHEN result IN ('Win', 'Loss', 'BE') THEN '✅ Valor correcto'
        ELSE '❌ Valor incorrecto'
    END as validacion
FROM trades
GROUP BY result
ORDER BY result;

SELECT 'Verificación completada. Revisa los resultados arriba.' as status; 