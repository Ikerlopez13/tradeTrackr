-- 🔥 SCRIPT PARA ARREGLAR EL PROBLEMA DE USERNAME NULL
-- ⚠️ Este script arregla el error [400] null value in column "username" violates not-null constraint
-- Ejecutar en Supabase SQL Editor

-- ========================================
-- 1. DIAGNÓSTICO DEL PROBLEMA
-- ========================================

-- Ver la estructura actual de la tabla profiles
SELECT 
    '📋 ESTRUCTURA ACTUAL DE PROFILES' as "INFO",
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Buscar registros con username NULL
SELECT 
    '🚨 REGISTROS CON USERNAME NULL' as "PROBLEMA",
    COUNT(*) as "CANTIDAD_AFECTADA"
FROM profiles 
WHERE username IS NULL;

-- Ver detalles de los registros problemáticos
SELECT 
    '👤 USUARIOS AFECTADOS' as "DETALLE",
    p.id as "UUID",
    p.username as "USERNAME_ACTUAL",
    au.email as "EMAIL",
    p.is_premium as "ES_PREMIUM",
    p.created_at as "FECHA_CREACION"
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.username IS NULL
ORDER BY p.created_at DESC;

-- ========================================
-- 2. ARREGLAR USERNAMES NULL
-- ========================================

-- Actualizar todos los registros con username NULL
UPDATE profiles 
SET username = SPLIT_PART(
    (SELECT email FROM auth.users WHERE id = profiles.id), 
    '@', 1
),
updated_at = NOW()
WHERE username IS NULL;

-- Verificar que se arreglaron todos
SELECT 
    '✅ VERIFICACIÓN POST-ARREGLO' as "RESULTADO",
    COUNT(*) as "REGISTROS_CON_USERNAME_NULL"
FROM profiles 
WHERE username IS NULL;

-- ========================================
-- 3. PREVENIR FUTUROS PROBLEMAS
-- ========================================

-- Crear función mejorada para handle_new_user que NUNCA deje username NULL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    unique_username TEXT;
    base_username TEXT;
    counter INTEGER := 1;
BEGIN
    -- Log para debugging
    RAISE NOTICE '🔥 Creando perfil para usuario: % (email: %)', NEW.id, NEW.email;
    
    -- Generar username base (NUNCA NULL)
    base_username := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'username', ''),
        NULLIF(SPLIT_PART(NEW.email, '@', 1), ''),
        'user_' || SUBSTRING(NEW.id::TEXT, 1, 8)
    );
    
    -- Encontrar username único
    unique_username := base_username;
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = unique_username) LOOP
        unique_username := base_username || '_' || counter;
        counter := counter + 1;
        -- Evitar bucle infinito
        IF counter > 100 THEN
            unique_username := base_username || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
            EXIT;
        END IF;
    END LOOP;
    
    -- Crear perfil con username GARANTIZADO (nunca NULL)
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
        unique_username,  -- GARANTIZADO que no es NULL
        1000.00,
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, profiles.username, 'user_' || SUBSTRING(NEW.id::TEXT, 1, 8)),
        updated_at = NOW();
    
    -- Crear user_stats también
    INSERT INTO public.user_stats (
        user_id,
        total_trades, wins, losses, breakevens,
        winning_trades, losing_trades, break_even_trades,
        total_pnl_percentage, total_pnl_pips, total_pnl_money,
        current_balance, updated_at
    )
    VALUES (
        NEW.id,
        0, 0, 0, 0, 0, 0, 0,
        0.00, 0.00, 0.00,
        1000.00,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();
    
    RAISE NOTICE '✅ Perfil creado exitosamente para: % con username: %', NEW.email, unique_username;
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ Error creando perfil para % (%): %', NEW.email, NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 4. FUNCIÓN ESPECIAL PARA MAKE.COM
-- ========================================

-- Función robusta para Make.com que maneja casos edge
CREATE OR REPLACE FUNCTION make_user_premium_safe(input_email TEXT)
RETURNS TABLE(
    status TEXT,
    user_id UUID,
    email TEXT,
    username TEXT,
    is_premium BOOLEAN,
    message TEXT
) AS $$
DECLARE
    found_user_id UUID;
    found_email TEXT;
    current_username TEXT;
    safe_username TEXT;
BEGIN
    -- Validar input
    IF input_email IS NULL OR input_email = '' THEN
        RETURN QUERY SELECT 
            'ERROR'::TEXT,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            FALSE::BOOLEAN,
            'Email is NULL or empty - check Stripe webhook data'::TEXT;
        RETURN;
    END IF;

    -- Buscar usuario
    SELECT au.id, au.email INTO found_user_id, found_email
    FROM auth.users au
    WHERE au.email = input_email;

    IF found_user_id IS NULL THEN
        RETURN QUERY SELECT 
            'ERROR'::TEXT,
            NULL::UUID,
            input_email,
            NULL::TEXT,
            FALSE::BOOLEAN,
            'User not found with email: ' || input_email::TEXT;
        RETURN;
    END IF;

    -- Obtener username actual o generar uno seguro
    SELECT username INTO current_username
    FROM profiles
    WHERE id = found_user_id;

    -- Generar username seguro si es NULL
    safe_username := COALESCE(
        NULLIF(current_username, ''),
        NULLIF(SPLIT_PART(found_email, '@', 1), ''),
        'user_' || SUBSTRING(found_user_id::TEXT, 1, 8)
    );

    -- Crear/actualizar perfil
    INSERT INTO profiles (id, username, account_balance, is_premium, created_at, updated_at)
    VALUES (
        found_user_id,
        safe_username,
        1000.00,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, profiles.username, safe_username),
        is_premium = TRUE,
        updated_at = NOW();

    -- Retornar resultado exitoso
    RETURN QUERY SELECT 
        'SUCCESS'::TEXT,
        found_user_id,
        found_email,
        safe_username,
        TRUE::BOOLEAN,
        'User successfully made premium'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. VERIFICACIÓN FINAL
-- ========================================

-- Verificar que no hay más usernames NULL
SELECT 
    '🎯 VERIFICACIÓN FINAL' as "RESULTADO",
    COUNT(*) as "TOTAL_PROFILES",
    COUNT(username) as "CON_USERNAME",
    COUNT(*) - COUNT(username) as "SIN_USERNAME_RESTANTES",
    CASE 
        WHEN COUNT(*) = COUNT(username) THEN '✅ TODOS LOS USERNAMES ESTÁN OK'
        ELSE '❌ AÚN HAY USERNAMES NULL'
    END as "ESTADO"
FROM profiles;

-- Mostrar algunos ejemplos de perfiles arreglados
SELECT 
    '📋 EJEMPLOS DE PERFILES ARREGLADOS' as "INFO",
    p.username,
    au.email,
    p.is_premium,
    p.updated_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.updated_at DESC
LIMIT 5;

-- Verificar que el trigger está activo
SELECT 
    '🔧 ESTADO DEL TRIGGER' as "TRIGGER",
    t.tgname as "NOMBRE",
    CASE 
        WHEN t.tgenabled = 'O' THEN '✅ ACTIVO'
        ELSE '❌ INACTIVO'
    END as "ESTADO"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created'; 