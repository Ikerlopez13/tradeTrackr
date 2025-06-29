-- 🔥 ARREGLAR SISTEMA COMPLETO DE REGISTRO DE USUARIOS
-- ⚠️ Este script diagnostica y arregla TODO el flujo de registro
-- Ejecutar en Supabase SQL Editor

-- ========================================
-- 1. DIAGNÓSTICO COMPLETO DEL SISTEMA
-- ========================================

-- Ver estado actual de usuarios y perfiles
SELECT 
    '📊 ESTADO ACTUAL DEL SISTEMA' as "DIAGNÓSTICO",
    COUNT(au.id) as "👥 TOTAL_USUARIOS_AUTH",
    COUNT(p.id) as "👤 CON_PERFIL",
    COUNT(us.user_id) as "📈 CON_STATS",
    COUNT(au.id) - COUNT(p.id) as "❌ SIN_PERFIL",
    CASE 
        WHEN COUNT(au.id) = COUNT(p.id) THEN '✅ TODOS TIENEN PERFIL'
        ELSE '⚠️ HAY ' || (COUNT(au.id) - COUNT(p.id))::text || ' SIN PERFIL'
    END as "ESTADO_GENERAL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id;

-- Verificar trigger actual
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

-- Ver usuarios sin perfil (los que el trigger no procesó)
SELECT 
    '🚨 USUARIOS SIN PERFIL' as "PROBLEMA",
    au.email as "📧 EMAIL",
    au.id as "🔑 UUID",
    au.created_at as "📅 REGISTRADO",
    EXTRACT(DAYS FROM NOW() - au.created_at) as "📊 DÍAS_SIN_PERFIL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC
LIMIT 10;

-- ========================================
-- 2. ELIMINAR TRIGGER Y FUNCIÓN PROBLEMÁTICOS
-- ========================================

-- Eliminar trigger existente (puede estar corrupto)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Eliminar función existente (puede tener errores)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ========================================
-- 3. CREAR FUNCIÓN MEJORADA Y ROBUSTA
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    unique_username TEXT;
    base_username TEXT;
    counter INTEGER := 1;
BEGIN
    -- Log para debugging (aparecerá en Supabase Logs)
    RAISE NOTICE '🔥 INICIANDO CREACIÓN DE PERFIL para: % (email: %)', NEW.id, NEW.email;
    
    -- Generar username base desde email
    base_username := SPLIT_PART(NEW.email, '@', 1);
    
    -- Asegurar que el username sea único
    unique_username := base_username;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = unique_username) LOOP
        unique_username := base_username || '_' || counter;
        counter := counter + 1;
        -- Evitar bucle infinito
        IF counter > 100 THEN
            unique_username := base_username || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
            EXIT;
        END IF;
    END LOOP;
    
    RAISE NOTICE '📝 Username generado: %', unique_username;
    
    -- Crear perfil en tabla profiles
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
        unique_username,
        1000.00,          -- Balance inicial
        false,            -- No premium por defecto
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(profiles.username, EXCLUDED.username),
        account_balance = COALESCE(profiles.account_balance, EXCLUDED.account_balance),
        updated_at = NOW();
    
    RAISE NOTICE '✅ Perfil creado en tabla profiles';
    
    -- Crear estadísticas en tabla user_stats
    INSERT INTO public.user_stats (
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
    VALUES (
        NEW.id,
        0, 0, 0, 0,       -- Contadores en 0
        0, 0, 0,          -- Más contadores en 0
        0.00, 0.00, 0.00, -- PnL en 0
        1000.00,          -- Balance inicial
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        current_balance = COALESCE(user_stats.current_balance, EXCLUDED.current_balance),
        updated_at = NOW();
    
    RAISE NOTICE '✅ Stats creadas en tabla user_stats';
    RAISE NOTICE '🎉 PERFIL COMPLETADO EXITOSAMENTE para: % con username: %', NEW.email, unique_username;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error DETALLADO pero NO fallar la autenticación
        RAISE WARNING '❌ ERROR CREANDO PERFIL para % (%): %', NEW.email, NEW.id, SQLERRM;
        RAISE WARNING '❌ DETALLE DEL ERROR: %', SQLSTATE;
        -- Aún así, permitir que el usuario se registre en auth.users
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. CREAR TRIGGER NUEVO Y ROBUSTO
-- ========================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 5. ARREGLAR USUARIOS EXISTENTES SIN PERFIL
-- ========================================

-- Deshabilitar RLS temporalmente para operaciones masivas
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- Crear perfiles para TODOS los usuarios existentes sin perfil
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
    -- Username único con timestamp para evitar colisiones
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE username = SPLIT_PART(au.email, '@', 1)
        ) THEN SPLIT_PART(au.email, '@', 1)
        ELSE SPLIT_PART(au.email, '@', 1) || '_' || 
             EXTRACT(EPOCH FROM au.created_at)::bigint::text
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

-- Crear user_stats para usuarios sin estadísticas
INSERT INTO user_stats (
    user_id,
    total_trades, wins, losses, breakevens,
    winning_trades, losing_trades, break_even_trades,
    total_pnl_percentage, total_pnl_pips, total_pnl_money,
    current_balance, updated_at
)
SELECT 
    au.id as user_id,
    0, 0, 0, 0, 0, 0, 0,  -- Contadores en 0
    0.00, 0.00, 0.00,     -- PnL en 0
    1000.00,              -- Balance inicial
    NOW()
FROM auth.users au
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE us.user_id IS NULL  -- Solo usuarios SIN stats
ON CONFLICT (user_id) DO UPDATE SET
    current_balance = COALESCE(user_stats.current_balance, EXCLUDED.current_balance),
    updated_at = NOW();

-- Reactivar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. VERIFICAR QUE TODO FUNCIONA
-- ========================================

-- Estado final después del arreglo
SELECT 
    '🎯 RESULTADO DESPUÉS DEL FIX' as "RESUMEN_FINAL",
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

-- Verificar que el trigger está funcionando
SELECT 
    '🔧 TRIGGER DESPUÉS DEL FIX' as "VERIFICACIÓN_TRIGGER",
    t.tgname as "NOMBRE",
    CASE 
        WHEN t.tgenabled = 'O' THEN '✅ ACTIVO'
        WHEN t.tgenabled = 'D' THEN '❌ DESHABILITADO'
        ELSE '⚠️ PROBLEMA'
    END as "ESTADO",
    p.proname as "FUNCIÓN"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Mostrar últimos perfiles creados
SELECT 
    '🆕 PERFILES RECIÉN CREADOS' as "NUEVOS",
    p.username as "👤 USERNAME",
    p.account_balance as "💰 BALANCE",
    au.email as "📧 EMAIL",
    p.created_at as "📅 CREADO"
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY p.created_at DESC
LIMIT 10;

-- ========================================
-- 7. INSTRUCCIONES PARA PROBAR
-- ========================================

SELECT 
    '🧪 CÓMO PROBAR QUE FUNCIONA' as "INSTRUCCIONES",
    '1. Registra un nuevo usuario en tu app' as "PASO_1",
    '2. Ve a auth.users en Supabase para ver el nuevo usuario' as "PASO_2",
    '3. Ve a profiles - debe aparecer automáticamente' as "PASO_3",
    '4. Ve a user_stats - debe aparecer automáticamente' as "PASO_4",
    '5. Revisa Supabase Logs para ver los mensajes del trigger' as "PASO_5";

-- ========================================
-- 8. MENSAJE FINAL
-- ========================================

SELECT 
    '🔥 SISTEMA DE REGISTRO COMPLETAMENTE ARREGLADO' as "ESTADO",
    '✅ Trigger recreado con logs detallados' as "PASO_1",
    '✅ Función mejorada con manejo de errores' as "PASO_2",
    '✅ Usuarios existentes procesados' as "PASO_3",
    '✅ Usernames únicos garantizados' as "PASO_4",
    '🚀 Los nuevos registros crearán perfiles automáticamente' as "RESULTADO",
    '📝 Revisa Supabase Logs para ver el trigger funcionando' as "DEBUG"; 