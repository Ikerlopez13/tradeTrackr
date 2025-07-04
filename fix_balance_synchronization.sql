-- 🔥 ARREGLAR SINCRONIZACIÓN DE BALANCES
-- ⚠️ Problema: profiles.account_balance ≠ user_stats.current_balance
-- 📊 Este script diagnostica y sincroniza ambos valores

-- ========================================
-- 1. DIAGNÓSTICO COMPLETO
-- ========================================

SELECT '🔍 DIAGNÓSTICO: Desincronización de balances' as "ESTADO";

-- Ver la desincronización actual
SELECT 
    '📊 COMPARACIÓN DE BALANCES' as "SECCIÓN",
    p.username as "👤 USUARIO",
    p.account_balance as "💰 BALANCE_PERFIL",
    us.current_balance as "📈 BALANCE_STATS", 
    CASE 
        WHEN p.account_balance = us.current_balance THEN '✅ SINCRONIZADO'
        WHEN p.account_balance != us.current_balance THEN '❌ DESINCRONIZADO'
        WHEN us.current_balance IS NULL THEN '⚠️ SIN STATS'
        ELSE '❓ DESCONOCIDO'
    END as "🔄 ESTADO",
    ABS(COALESCE(p.account_balance, 0) - COALESCE(us.current_balance, 0)) as "📏 DIFERENCIA"
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
ORDER BY ABS(COALESCE(p.account_balance, 0) - COALESCE(us.current_balance, 0)) DESC;

-- Ver trades para entender el cálculo correcto
SELECT 
    '📈 TRADES Y BALANCES REALES' as "SECCIÓN",
    p.username as "👤 USUARIO",
    p.account_balance as "💰 BALANCE_INICIAL",
    COUNT(t.id) as "🔢 TOTAL_TRADES",
    COALESCE(SUM(t.pnl_percentage), 0) as "📊 PNL_TOTAL_%",
    -- Balance real calculado: balance_inicial * (1 + pnl_total/100)
    p.account_balance * (1 + COALESCE(SUM(t.pnl_percentage), 0) / 100) as "💎 BALANCE_REAL_CALCULADO",
    us.current_balance as "📈 BALANCE_STATS_ACTUAL"
FROM profiles p
LEFT JOIN trades t ON p.id = t.user_id
LEFT JOIN user_stats us ON p.id = us.user_id
GROUP BY p.id, p.username, p.account_balance, us.current_balance
ORDER BY p.username;

-- ========================================
-- 2. IDENTIFICAR USUARIO ESPECÍFICO (tu caso)
-- ========================================

SELECT 
    '🎯 ANÁLISIS ESPECÍFICO DE TU USUARIO' as "SECCIÓN",
    p.username as "👤 USUARIO",
    p.account_balance as "💰 BALANCE_PERFIL",
    us.current_balance as "📈 BALANCE_LEADERBOARD",
    COUNT(t.id) as "🔢 TRADES",
    COALESCE(SUM(t.pnl_percentage), 0) as "📊 PNL_TOTAL_%",
    p.account_balance * (1 + COALESCE(SUM(t.pnl_percentage), 0) / 100) as "💎 BALANCE_CORRECTO",
    us.updated_at as "🕐 ÚLTIMA_ACTUALIZACIÓN"
FROM profiles p
LEFT JOIN trades t ON p.id = t.user_id
LEFT JOIN user_stats us ON p.id = us.user_id
WHERE p.username LIKE '%lopezalegreiker%' OR p.username LIKE '%iker%'
GROUP BY p.id, p.username, p.account_balance, us.current_balance, us.updated_at;

-- ========================================
-- 3. CORRECCIÓN AUTOMÁTICA
-- ========================================

-- Opción A: Actualizar user_stats.current_balance basado en cálculo real
UPDATE user_stats 
SET current_balance = subquery.balance_correcto,
    updated_at = NOW()
FROM (
    SELECT 
        p.id as user_id,
        p.account_balance * (1 + COALESCE(SUM(t.pnl_percentage), 0) / 100) as balance_correcto
    FROM profiles p
    LEFT JOIN trades t ON p.id = t.user_id
    GROUP BY p.id, p.account_balance
) as subquery
WHERE user_stats.user_id = subquery.user_id;

-- Opción B: Para usuarios sin trades, sincronizar con account_balance
UPDATE user_stats 
SET current_balance = p.account_balance,
    updated_at = NOW()
FROM profiles p
WHERE user_stats.user_id = p.id 
AND NOT EXISTS (SELECT 1 FROM trades WHERE user_id = p.id);

-- ========================================
-- 4. CREAR TRIGGER PARA MANTENER SINCRONIZACIÓN
-- ========================================

-- Función para mantener sincronizados los balances
CREATE OR REPLACE FUNCTION sync_balance_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando se actualiza account_balance en profiles,
    -- recalcular current_balance en user_stats
    UPDATE user_stats 
    SET current_balance = NEW.account_balance * (
        1 + COALESCE((
            SELECT SUM(pnl_percentage) / 100 
            FROM trades 
            WHERE user_id = NEW.id
        ), 0)
    ),
    updated_at = NOW()
    WHERE user_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger en profiles para sincronizar automáticamente
DROP TRIGGER IF EXISTS sync_balance_trigger ON profiles;
CREATE TRIGGER sync_balance_trigger
    AFTER UPDATE OF account_balance ON profiles
    FOR EACH ROW
    WHEN (OLD.account_balance IS DISTINCT FROM NEW.account_balance)
    EXECUTE FUNCTION sync_balance_on_profile_update();

-- ========================================
-- 5. VERIFICACIÓN FINAL
-- ========================================

SELECT '✅ VERIFICACIÓN FINAL' as "ESTADO";

-- Ver balances después de la corrección
SELECT 
    '🎉 BALANCES SINCRONIZADOS' as "SECCIÓN",
    p.username as "👤 USUARIO",
    p.account_balance as "💰 BALANCE_PERFIL",
    us.current_balance as "📈 BALANCE_LEADERBOARD",
    CASE 
        WHEN ABS(p.account_balance - us.current_balance) < 0.01 THEN '✅ SINCRONIZADO'
        ELSE '❌ AÚN DESINCRONIZADO'
    END as "🔄 ESTADO",
    us.updated_at as "🕐 ACTUALIZADO"
FROM profiles p
JOIN user_stats us ON p.id = us.user_id
ORDER BY p.username;

-- Estadísticas finales
SELECT 
    '📊 ESTADÍSTICAS FINALES' as "SECCIÓN",
    COUNT(*) as "👥 USUARIOS_TOTALES",
    COUNT(CASE WHEN ABS(p.account_balance - us.current_balance) < 0.01 THEN 1 END) as "✅ SINCRONIZADOS",
    COUNT(CASE WHEN ABS(p.account_balance - us.current_balance) >= 0.01 THEN 1 END) as "❌ DESINCRONIZADOS"
FROM profiles p
JOIN user_stats us ON p.id = us.user_id;

SELECT '🚀 SCRIPT COMPLETADO - Balances sincronizados y trigger creado' as "RESULTADO"; 