-- Script de diagnóstico completo para identificar el problema de 0€ en leaderboards

SELECT '=== DIAGNÓSTICO COMPLETO DE LEADERBOARDS ===' as titulo;

-- 1. Verificar usuarios autenticados
SELECT 
    '1. Usuarios en auth.users:' as seccion,
    COUNT(*) as total_usuarios,
    string_agg(email, ', ') as emails
FROM auth.users;

-- 2. Verificar perfiles de usuarios
SELECT 
    '2. Perfiles de usuarios:' as seccion,
    p.id,
    p.username,
    p.account_balance,
    p.is_premium,
    p.created_at
FROM profiles p
ORDER BY p.created_at DESC;

-- 3. Verificar trades existentes
SELECT 
    '3. Trades en sistema:' as seccion,
    t.id,
    t.user_id,
    t.title,
    t.pnl_percentage,
    t.pnl_money,
    t.result,
    t.created_at
FROM trades t
ORDER BY t.created_at DESC
LIMIT 10;

-- 4. Verificar user_stats
SELECT 
    '4. Estadísticas de usuarios:' as seccion,
    us.user_id,
    p.username,
    us.total_trades,
    us.wins,
    us.losses,
    us.total_pnl_percentage,
    us.current_balance,
    us.updated_at
FROM user_stats us
JOIN profiles p ON us.user_id = p.id
ORDER BY us.updated_at DESC;

-- 5. Verificar qué devuelve la vista global_leaderboard
SELECT 
    '5. Vista global_leaderboard:' as seccion,
    gl.id,
    gl.username,
    gl.total_trades,
    gl.current_balance,
    gl.total_return_percentage,
    gl.pnl_rank,
    gl.balance_rank
FROM global_leaderboard gl
ORDER BY gl.pnl_rank ASC
LIMIT 10;

-- 6. Verificar si la vista existe
SELECT 
    '6. Verificar vista existe:' as seccion,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('global_leaderboard', 'group_leaderboard');

-- 7. Diagnóstico de problema específico: ¿Por qué current_balance es 0?
SELECT 
    '7. Análisis de current_balance:' as seccion,
    CASE 
        WHEN COUNT(*) = 0 THEN 'NO HAY DATOS EN user_stats'
        WHEN COUNT(*) FILTER (WHERE current_balance IS NULL) > 0 THEN 'HAY VALORES NULL en current_balance'
        WHEN COUNT(*) FILTER (WHERE current_balance = 0) = COUNT(*) THEN 'TODOS LOS current_balance SON 0'
        WHEN AVG(current_balance) > 0 THEN 'HAY BALANCES VÁLIDOS'
        ELSE 'PROBLEMA DESCONOCIDO'
    END as diagnostico,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE current_balance IS NULL) as balances_null,
    COUNT(*) FILTER (WHERE current_balance = 0) as balances_cero,
    COUNT(*) FILTER (WHERE current_balance > 0) as balances_positivos,
    AVG(current_balance) as promedio_balance
FROM user_stats;

-- 8. Verificar si los triggers están funcionando
SELECT 
    '8. Triggers en trades:' as seccion,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trades';

-- 9. Solución temporal: Mostrar qué debería tener cada usuario
SELECT 
    '9. Balance que debería tener cada usuario:' as seccion,
    p.username,
    p.account_balance as balance_inicial,
    COALESCE(SUM(t.pnl_percentage), 0) as total_pnl_percentage,
    p.account_balance * (1 + COALESCE(SUM(t.pnl_percentage), 0) / 100) as balance_calculado,
    us.current_balance as balance_actual_en_db
FROM profiles p
LEFT JOIN trades t ON t.user_id = p.id
LEFT JOIN user_stats us ON us.user_id = p.id
GROUP BY p.id, p.username, p.account_balance, us.current_balance
ORDER BY p.created_at DESC;

SELECT '=== FIN DIAGNÓSTICO ===' as titulo; 