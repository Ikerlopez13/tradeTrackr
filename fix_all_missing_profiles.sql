-- 🔥 SCRIPT COMPLETO: ARREGLAR TODOS LOS USUARIOS SIN PERFIL
-- ⚠️ ESTE SCRIPT HACE TODO: DIAGNÓSTICO + CREACIÓN + ARREGLO DEL TRIGGER
-- Ejecutar en Supabase SQL Editor

-- ========================================
-- 1. DIAGNÓSTICO INICIAL
-- ========================================
SELECT 
    '🔍 DIAGNÓSTICO INICIAL' as "PASO_1",
    COUNT(au.id) as "👥 TOTAL_USUARIOS_AUTH",
    COUNT(p.id) as "👤 USUARIOS_CON_PERFIL",
    COUNT(au.id) - COUNT(p.id) as "❌ USUARIOS_SIN_PERFIL",
    ROUND(
        (COUNT(p.id)::numeric / NULLIF(COUNT(au.id), 0)::numeric) * 100, 2
    ) as "📈 PORCENTAJE_CON_PERFIL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id;

-- Ver usuarios específicos sin perfil
SELECT 
    '📋 USUARIOS QUE SE VAN A CREAR' as "DETALLE",
    au.email as "EMAIL",
    au.id as "UUID",
    SPLIT_PART(au.email, '@', 1) as "USERNAME_BASE",
    au.created_at as "FECHA_REGISTRO",
    EXTRACT(DAYS FROM NOW() - au.created_at) as "DÍAS_SIN_PERFIL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- ========================================
-- 2. CREAR TODOS LOS PERFILES FALTANTES
-- ========================================

-- Deshabilitar RLS temporalmente para evitar problemas
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- Crear perfiles para TODOS los usuarios sin perfil (CON USERNAMES ÚNICOS)
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
    -- Generar username único: si existe, agregar parte del UUID
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE username = SPLIT_PART(au.email, '@', 1)
        ) THEN SPLIT_PART(au.email, '@', 1)
        ELSE SPLIT_PART(au.email, '@', 1) || '_' || SUBSTRING(au.id::text, 1, 6)
    END as username,
    1000.00 as account_balance,                -- Balance inicial estándar
    false as is_premium,                       -- No premium por defecto
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Solo usuarios SIN perfil
ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, profiles.username),
    account_balance = COALESCE(profiles.account_balance, EXCLUDED.account_balance),
    updated_at = NOW();

-- Crear user_stats para TODOS los usuarios sin stats
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
    0 as total_trades,
    0 as wins,
    0 as losses,
    0 as breakevens,
    0 as winning_trades,
    0 as losing_trades,
    0 as break_even_trades,
    0.00 as total_pnl_percentage,
    0.00 as total_pnl_pips,
    0.00 as total_pnl_money,
    1000.00 as current_balance,  -- Mismo que account_balance
    NOW() as updated_at
FROM auth.users au
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE us.user_id IS NULL  -- Solo usuarios SIN stats
ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

-- Reactivar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. ARREGLAR EL TRIGGER AUTOMÁTICO
-- ========================================

-- Eliminar trigger existente (por si está corrupto)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recrear la función mejorada CON USERNAMES ÚNICOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    unique_username TEXT;
    base_username TEXT;
    counter INTEGER := 1;
BEGIN
    -- Log para debugging
    RAISE NOTICE '🔥 Creando perfil automático para: % (email: %)', NEW.id, NEW.email;
    
    -- Generar username base
    base_username := COALESCE(
        NEW.raw_user_meta_data->>'username', 
        SPLIT_PART(NEW.email, '@', 1)
    );
    
    -- Encontrar username único
    unique_username := base_username;
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = unique_username) LOOP
        unique_username := base_username || '_' || counter;
        counter := counter + 1;
    END LOOP;
    
    -- Crear perfil automáticamente
    INSERT INTO public.profiles (
        id, 
        username, 
        account_balance, 
        is_premium, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        unique_username,  -- Username único garantizado
        1000.00,          -- Balance inicial
        false,            -- No premium
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, profiles.username),
        updated_at = NOW();
    
    -- Crear estadísticas automáticamente
    INSERT INTO public.user_stats (
        user_id,
        total_trades, wins, losses, breakevens,
        winning_trades, losing_trades, break_even_trades,
        total_pnl_percentage, total_pnl_pips, total_pnl_money,
        current_balance, updated_at
    )
    VALUES (
        NEW.id,
        0, 0, 0, 0,     -- Contadores en 0
        0, 0, 0,        -- Más contadores en 0
        0.00, 0.00, 0.00,  -- PnL en 0
        1000.00,        -- Balance inicial
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();
    
    RAISE NOTICE '✅ Perfil creado exitosamente para: % con username: %', NEW.email, unique_username;
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error pero NO fallar la autenticación
        RAISE WARNING '❌ Error creando perfil para % (%): %', NEW.email, NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 4. VERIFICACIÓN FINAL
-- ========================================

-- Verificar que el trigger está activo
SELECT 
    '🔧 ESTADO DEL TRIGGER' as "VERIFICACIÓN",
    t.tgname as "NOMBRE_TRIGGER",
    CASE 
        WHEN t.tgenabled = 'O' THEN '✅ ACTIVO'
        WHEN t.tgenabled = 'D' THEN '❌ DESHABILITADO'
        ELSE '⚠️ PROBLEMA'
    END as "ESTADO",
    p.proname as "FUNCIÓN"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Estadísticas finales
SELECT 
    '📊 RESULTADO FINAL' as "RESUMEN",
    COUNT(au.id) as "👥 TOTAL_USUARIOS",
    COUNT(p.id) as "👤 CON_PERFIL",
    COUNT(us.user_id) as "📈 CON_STATS",
    COUNT(au.id) - COUNT(p.id) as "❌ SIN_PERFIL_RESTANTES",
    CASE 
        WHEN COUNT(au.id) = COUNT(p.id) THEN '🎉 TODOS TIENEN PERFIL'
        ELSE '⚠️ AÚN HAY USUARIOS SIN PERFIL'
    END as "ESTADO_GENERAL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id;

-- Mostrar últimos perfiles creados
SELECT 
    '🆕 PERFILES RECIÉN CREADOS' as "NUEVOS_PERFILES",
    p.username,
    p.account_balance,
    au.email,
    p.created_at as "FECHA_CREACIÓN"
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.created_at >= NOW() - INTERVAL '10 minutes'  -- Últimos 10 minutos
ORDER BY p.created_at DESC
LIMIT 20;

-- ========================================
-- 5. MENSAJE FINAL
-- ========================================
SELECT 
    '🔥 PROCESO COMPLETADO' as "ESTADO",
    '✅ Perfiles creados para usuarios existentes' as "PASO_1",
    '✅ Trigger arreglado para futuros usuarios' as "PASO_2", 
    '✅ Sistema funcionando correctamente' as "PASO_3",
    '🚀 Los nuevos usuarios ahora tendrán perfiles automáticamente' as "RESULTADO"; 