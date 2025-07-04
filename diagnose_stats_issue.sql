-- Script de diagnóstico para el problema de estadísticas en 0
-- Este script identifica por qué las estadísticas no se están calculando correctamente

-- 1. Verificar si existen trades en la base de datos
SELECT 
    'VERIFICACIÓN DE TRADES' as titulo,
    COUNT(*) as total_trades,
    COUNT(CASE WHEN result = 'Win' THEN 1 END) as wins,
    COUNT(CASE WHEN result = 'Loss' THEN 1 END) as losses,
    COUNT(CASE WHEN result = 'BE' THEN 1 END) as breakevens,
    COUNT(DISTINCT user_id) as usuarios_unicos
FROM trades;

-- 2. Verificar contenido de la tabla user_stats
SELECT 
    'CONTENIDO DE USER_STATS' as titulo,
    us.*,
    p.username,
    p.email
FROM user_stats us
LEFT JOIN profiles p ON us.user_id = p.id
ORDER BY us.updated_at DESC NULLS LAST;

-- 3. Verificar si hay usuarios con trades pero sin estadísticas
SELECT 
    'USUARIOS CON TRADES SIN ESTADÍSTICAS' as titulo,
    t.user_id,
    p.username,
    p.email,
    COUNT(*) as trades_count,
    us.user_id as tiene_estadisticas
FROM trades t
LEFT JOIN profiles p ON t.user_id = p.id
LEFT JOIN user_stats us ON t.user_id = us.user_id
WHERE us.user_id IS NULL
GROUP BY t.user_id, p.username, p.email, us.user_id;

-- 4. Verificar si los triggers están funcionando
SELECT 
    'TRIGGERS ACTIVOS' as titulo,
    trigger_name,
    event_manipulation,
    action_timing,
    trigger_schema,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'trades'
ORDER BY trigger_name;

-- 5. Verificar si la función update_user_stats existe
SELECT 
    'FUNCIÓN UPDATE_USER_STATS' as titulo,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_user_stats';

-- 6. Comparar datos calculados vs almacenados para un usuario específico
WITH user_trades AS (
    SELECT 
        user_id,
        COUNT(*) as trades_calculados,
        COUNT(CASE WHEN result = 'Win' THEN 1 END) as wins_calculados,
        COUNT(CASE WHEN result = 'Loss' THEN 1 END) as losses_calculados,
        COUNT(CASE WHEN result = 'BE' THEN 1 END) as be_calculados,
        COALESCE(SUM(pnl_percentage), 0) as total_pnl_pct_calculado,
        COALESCE(SUM(pnl_pips), 0) as total_pnl_pips_calculado,
        COALESCE(SUM(pnl_money), 0) as total_pnl_money_calculado
    FROM trades
    GROUP BY user_id
)
SELECT 
    'COMPARACIÓN CALCULADO VS ALMACENADO' as titulo,
    p.username,
    p.email,
    ut.trades_calculados,
    us.total_trades as trades_almacenados,
    ut.wins_calculados,
    us.wins as wins_almacenados,
    ut.losses_calculados,
    us.losses as losses_almacenados,
    ut.total_pnl_pct_calculado,
    us.total_pnl_percentage as pnl_pct_almacenado,
    CASE 
        WHEN us.user_id IS NULL THEN '❌ Sin estadísticas'
        WHEN ut.trades_calculados != us.total_trades THEN '❌ Desincronizado'
        ELSE '✅ Sincronizado'
    END as estado
FROM user_trades ut
LEFT JOIN profiles p ON ut.user_id = p.id
LEFT JOIN user_stats us ON ut.user_id = us.user_id
ORDER BY p.username;

-- 7. Verificar estructura de la tabla user_stats
SELECT 
    'ESTRUCTURA DE USER_STATS' as titulo,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
ORDER BY ordinal_position;

-- 8. Verificar si hay errores en los datos
SELECT 
    'VERIFICACIÓN DE DATOS INCONSISTENTES' as titulo,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN result NOT IN ('Win', 'Loss', 'BE') THEN 1 END) as resultados_invalidos,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as user_id_nulos,
    COUNT(CASE WHEN created_at IS NULL THEN 1 END) as fechas_nulas
FROM trades;

-- 9. Mostrar algunos trades de ejemplo
SELECT 
    'EJEMPLOS DE TRADES' as titulo,
    t.id,
    t.user_id,
    p.username,
    t.result,
    t.pnl_percentage,
    t.pnl_pips,
    t.pnl_money,
    t.created_at
FROM trades t
LEFT JOIN profiles p ON t.user_id = p.id
ORDER BY t.created_at DESC
LIMIT 10;

SELECT 'Diagnóstico completado. Revisa los resultados para identificar el problema.' as status; 