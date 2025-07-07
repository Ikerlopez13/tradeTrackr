-- Script mejorado para sincronizar usuarios de auth.users con profiles
-- Versión 2.0 con mejor manejo de errores y verificaciones

-- PASO 1: Verificar estructura de tablas
DO $$
BEGIN
    -- Verificar si la tabla profiles existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'La tabla profiles no existe en el esquema public';
    END IF;
    
    -- Verificar si auth.users es accesible
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
        RAISE EXCEPTION 'No se puede acceder a la tabla auth.users';
    END IF;
    
    RAISE NOTICE 'Verificación de tablas completada exitosamente';
END $$;

-- PASO 2: Mostrar estado actual antes de la sincronización
SELECT 
    'ANTES DE SINCRONIZAR' as status,
    'auth.users' as tabla,
    COUNT(*) as total_usuarios
FROM auth.users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'ANTES DE SINCRONIZAR' as status,
    'profiles' as tabla,
    COUNT(*) as total_perfiles
FROM public.profiles
UNION ALL
SELECT 
    'ANTES DE SINCRONIZAR' as status,
    'usuarios_sin_perfil' as tabla,
    COUNT(*) as faltantes
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
AND au.email IS NOT NULL;

-- PASO 3: Insertar usuarios faltantes con manejo de errores
DO $$
DECLARE
    usuarios_insertados INTEGER := 0;
    error_message TEXT;
BEGIN
    -- Insertar usuarios que no tienen perfil
    INSERT INTO public.profiles (
        id,
        username,
        email,
        account_balance,
        is_premium,
        created_at,
        updated_at
    )
    SELECT 
        au.id,
        COALESCE(
            au.raw_user_meta_data->>'username', 
            au.raw_user_meta_data->>'name',
            SPLIT_PART(au.email, '@', 1)
        ) as username,
        au.email,
        1000.00 as account_balance,
        false as is_premium,
        au.created_at,
        NOW() as updated_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
    AND au.email IS NOT NULL
    AND au.email_confirmed_at IS NOT NULL; -- Solo usuarios con email confirmado
    
    GET DIAGNOSTICS usuarios_insertados = ROW_COUNT;
    RAISE NOTICE 'Usuarios insertados: %', usuarios_insertados;
    
EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE NOTICE 'Error al insertar usuarios: %', error_message;
END $$;

-- PASO 4: Actualizar emails que no coincidan
DO $$
DECLARE
    emails_actualizados INTEGER := 0;
BEGIN
    UPDATE public.profiles 
    SET 
        email = au.email,
        updated_at = NOW()
    FROM auth.users au
    WHERE profiles.id = au.id
    AND (profiles.email IS NULL OR profiles.email != au.email);
    
    GET DIAGNOSTICS emails_actualizados = ROW_COUNT;
    RAISE NOTICE 'Emails actualizados: %', emails_actualizados;
END $$;

-- PASO 5: Actualizar usernames vacíos
DO $$
DECLARE
    usernames_actualizados INTEGER := 0;
BEGIN
    UPDATE public.profiles 
    SET 
        username = COALESCE(
            au.raw_user_meta_data->>'username', 
            au.raw_user_meta_data->>'name',
            SPLIT_PART(au.email, '@', 1)
        ),
        updated_at = NOW()
    FROM auth.users au
    WHERE profiles.id = au.id
    AND (profiles.username IS NULL OR profiles.username = '' OR profiles.username = 'null');
    
    GET DIAGNOSTICS usernames_actualizados = ROW_COUNT;
    RAISE NOTICE 'Usernames actualizados: %', usernames_actualizados;
END $$;

-- PASO 6: Verificar resultados después de la sincronización
SELECT 
    'DESPUÉS DE SINCRONIZAR' as status,
    'auth.users' as tabla,
    COUNT(*) as total_usuarios
FROM auth.users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'DESPUÉS DE SINCRONIZAR' as status,
    'profiles' as tabla,
    COUNT(*) as total_perfiles
FROM public.profiles
UNION ALL
SELECT 
    'DESPUÉS DE SINCRONIZAR' as status,
    'usuarios_sin_perfil' as tabla,
    COUNT(*) as faltantes
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
AND au.email IS NOT NULL;

-- PASO 7: Mostrar usuarios sincronizados recientemente
SELECT 
    'USUARIOS SINCRONIZADOS' as info,
    p.id,
    p.username,
    p.email,
    p.account_balance,
    p.is_premium,
    au.email_confirmed_at,
    au.created_at as auth_created_at,
    p.created_at as profile_created_at,
    p.updated_at as profile_updated_at
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY p.updated_at DESC;

-- PASO 8: Mostrar usuarios que aún faltan (si los hay)
SELECT 
    'USUARIOS FALTANTES' as info,
    au.id,
    au.email,
    au.email_confirmed_at,
    au.created_at,
    au.raw_user_meta_data
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
AND au.email IS NOT NULL
ORDER BY au.created_at DESC; 