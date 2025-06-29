-- 🔥 SCRIPT PARA ARREGLAR PERFILES FALTANTES RESTANTES
-- ⚠️ Para usuarios que AÚN no tienen perfil después de ejecutar el script anterior
-- Ejecutar en Supabase SQL Editor

-- ========================================
-- 1. DIAGNÓSTICO COMPLETO DE USUARIOS FALTANTES
-- ========================================

-- Ver TODOS los usuarios sin perfil (incluyendo los que pueden haberse perdido)
SELECT 
    '🚨 USUARIOS SIN PERFIL ENCONTRADOS' as "ESTADO",
    au.email as "📧 EMAIL",
    au.id as "🔑 UUID", 
    SPLIT_PART(au.email, '@', 1) as "👤 USERNAME_BASE",
    au.created_at as "📅 REGISTRADO",
    au.email_confirmed_at as "✅ EMAIL_CONFIRMADO",
    EXTRACT(DAYS FROM NOW() - au.created_at) as "📊 DÍAS_SIN_PERFIL",
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
        ELSE '❌ No confirmado'
    END as "ESTADO_EMAIL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Solo usuarios SIN perfil
ORDER BY au.created_at DESC;

-- Estadísticas actuales
SELECT 
    '📊 ESTADÍSTICAS ACTUALES' as "RESUMEN",
    COUNT(au.id) as "👥 TOTAL_USUARIOS_AUTH",
    COUNT(p.id) as "👤 CON_PERFIL",
    COUNT(us.user_id) as "📈 CON_STATS", 
    COUNT(au.id) - COUNT(p.id) as "❌ SIN_PERFIL",
    ROUND(
        (COUNT(p.id)::numeric / NULLIF(COUNT(au.id), 0)::numeric) * 100, 2
    ) as "📈 PORCENTAJE_CON_PERFIL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id;

-- ========================================
-- 2. CREAR PERFILES PARA USUARIOS RESTANTES
-- ========================================

-- Deshabilitar RLS temporalmente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- Crear perfiles para TODOS los usuarios que aún no tienen (con manejo mejorado de usernames únicos)
INSERT INTO profiles (
    id, 
    username, 
    account_balance, 
    is_premium, 
    created_at, 
    updated_at
)
SELECT 
    au.id,
    -- Generar username único más robusto
    CASE 
        -- Si el username base no existe, usarlo
        WHEN NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE username = SPLIT_PART(au.email, '@', 1)
        ) THEN SPLIT_PART(au.email, '@', 1)
        
        -- Si existe, agregar timestamp para hacerlo único
        ELSE SPLIT_PART(au.email, '@', 1) || '_' || 
             EXTRACT(EPOCH FROM NOW())::bigint::text
    END as username,
    1000.00 as account_balance,
    false as is_premium,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Solo usuarios SIN perfil
ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(profiles.username, EXCLUDED.username),
    account_balance = COALESCE(profiles.account_balance, EXCLUDED.account_balance),
    updated_at = NOW();

-- Crear user_stats para usuarios restantes
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
    updated_at
)
SELECT 
    au.id as user_id,
    0, 0, 0, 0, 0, 0, 0,  -- Todos los contadores en 0
    0.00, 0.00, 0.00,     -- PnL en 0
    1000.00,              -- Balance inicial
    NOW()
FROM auth.users au
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE us.user_id IS NULL  -- Solo usuarios SIN stats
ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

-- Reactivar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. VERIFICACIÓN ESPECÍFICA PARA EL USUARIO DE LA IMAGEN
-- ========================================

-- Verificar específicamente el usuario ilopeza@edu.tecnocampus.cat
SELECT 
    '🔍 VERIFICACIÓN ESPECÍFICA' as "USUARIO_ESPECÍFICO",
    au.email as "📧 EMAIL",
    au.id as "🔑 UUID",
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ PERFIL EXISTE'
        ELSE '❌ PERFIL FALTA'
    END as "ESTADO_PERFIL",
    CASE 
        WHEN us.user_id IS NOT NULL THEN '✅ STATS EXISTEN'
        ELSE '❌ STATS FALTAN'
    END as "ESTADO_STATS",
    p.username as "👤 USERNAME",
    p.account_balance as "💰 BALANCE"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE au.email LIKE '%ilopeza%' OR au.email LIKE '%edu.tecnocampus%';

-- ========================================
-- 4. FORZAR CREACIÓN SI AÚN FALTA EL USUARIO ESPECÍFICO
-- ========================================

-- Si el usuario específico aún no tiene perfil, crearlo manualmente
INSERT INTO profiles (
    id, 
    username, 
    account_balance, 
    is_premium, 
    created_at, 
    updated_at
)
SELECT 
    au.id,
    'ilopeza_' || EXTRACT(EPOCH FROM NOW())::bigint::text as username,  -- Username único garantizado
    1000.00,
    false,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'ilopeza@edu.tecnocampus.cat'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = au.id)
ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(profiles.username, EXCLUDED.username),
    updated_at = NOW();

-- Y sus stats
INSERT INTO user_stats (
    user_id,
    total_trades, wins, losses, breakevens,
    winning_trades, losing_trades, break_even_trades,
    total_pnl_percentage, total_pnl_pips, total_pnl_money,
    current_balance, updated_at
)
SELECT 
    au.id,
    0, 0, 0, 0, 0, 0, 0,
    0.00, 0.00, 0.00,
    1000.00,
    NOW()
FROM auth.users au
WHERE au.email = 'ilopeza@edu.tecnocampus.cat'
AND NOT EXISTS (SELECT 1 FROM user_stats WHERE user_id = au.id)
ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

-- ========================================
-- 5. VERIFICACIÓN FINAL COMPLETA
-- ========================================

-- Estadísticas finales después del fix
SELECT 
    '🎯 RESULTADO FINAL' as "RESUMEN_FINAL",
    COUNT(au.id) as "👥 TOTAL_USUARIOS",
    COUNT(p.id) as "👤 CON_PERFIL",
    COUNT(us.user_id) as "📈 CON_STATS",
    COUNT(au.id) - COUNT(p.id) as "❌ SIN_PERFIL_RESTANTES",
    CASE 
        WHEN COUNT(au.id) = COUNT(p.id) THEN '🎉 TODOS TIENEN PERFIL'
        ELSE '⚠️ AÚN HAY ' || (COUNT(au.id) - COUNT(p.id))::text || ' SIN PERFIL'
    END as "ESTADO_GENERAL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id;

-- Mostrar los últimos perfiles creados (para confirmar que se crearon)
SELECT 
    '🆕 PERFILES RECIÉN CREADOS' as "NUEVOS_PERFILES",
    p.username as "👤 USERNAME",
    p.account_balance as "💰 BALANCE",
    au.email as "📧 EMAIL",
    p.created_at as "📅 CREADO"
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.created_at >= NOW() - INTERVAL '5 minutes'  -- Últimos 5 minutos
ORDER BY p.created_at DESC
LIMIT 20;

-- Si aún hay usuarios sin perfil, mostrarlos
SELECT 
    '⚠️ USUARIOS QUE AÚN FALTAN' as "PROBLEMA_PERSISTENTE",
    au.email as "📧 EMAIL",
    au.id as "🔑 UUID",
    au.created_at as "📅 REGISTRADO"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- ========================================
-- 6. MENSAJE FINAL
-- ========================================
SELECT 
    '🔥 FIX COMPLETADO' as "ESTADO",
    '✅ Se procesaron todos los usuarios restantes' as "PASO_1",
    '✅ Se verificó específicamente ilopeza@edu.tecnocampus.cat' as "PASO_2",
    '✅ Se crearon perfiles y stats faltantes' as "PASO_3",
    '🚀 Ahora TODOS los usuarios deberían tener perfil' as "RESULTADO"; 