-- Script para sincronizar usuarios de auth.users con profiles
-- Esto asegura que todos los usuarios autenticados tengan un perfil

-- 1. Insertar usuarios que existen en auth.users pero no en profiles
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
    COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)) as username,
    au.email,
    1000.00 as account_balance, -- Balance inicial por defecto
    false as is_premium,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
AND au.email IS NOT NULL;

-- 2. Actualizar emails en profiles que no coincidan con auth.users
UPDATE public.profiles 
SET 
    email = au.email,
    updated_at = NOW()
FROM auth.users au
WHERE profiles.id = au.id
AND profiles.email != au.email;

-- 3. Actualizar username si está vacío en profiles pero existe en auth metadata
UPDATE public.profiles 
SET 
    username = COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
    updated_at = NOW()
FROM auth.users au
WHERE profiles.id = au.id
AND (profiles.username IS NULL OR profiles.username = '')
AND au.raw_user_meta_data->>'username' IS NOT NULL;

-- 4. Verificar resultados
SELECT 
    'auth.users' as table_name,
    COUNT(*) as total_records
FROM auth.users
WHERE email IS NOT NULL

UNION ALL

SELECT 
    'profiles' as table_name,
    COUNT(*) as total_records
FROM public.profiles

UNION ALL

SELECT 
    'missing_profiles' as table_name,
    COUNT(*) as total_records
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
AND au.email IS NOT NULL;

-- 5. Mostrar usuarios sincronizados
SELECT 
    p.id,
    p.username,
    p.email,
    p.account_balance,
    p.is_premium,
    au.email_confirmed_at,
    au.created_at as auth_created_at,
    p.created_at as profile_created_at
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC
LIMIT 10; 