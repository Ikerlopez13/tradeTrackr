-- Script simple para sincronizar usuarios de auth.users a profiles
-- Solo inserta usuarios faltantes

-- Ver cuántos usuarios faltan
SELECT 
    COUNT(*) as usuarios_en_auth,
    (SELECT COUNT(*) FROM public.profiles) as perfiles_existentes,
    COUNT(*) - (SELECT COUNT(*) FROM public.profiles) as usuarios_faltantes
FROM auth.users 
WHERE email IS NOT NULL;

-- Insertar usuarios faltantes
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
        SPLIT_PART(au.email, '@', 1)
    ) as username,
    au.email,
    1000.00 as account_balance,
    false as is_premium,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
WHERE au.email IS NOT NULL
AND au.id NOT IN (SELECT id FROM public.profiles);

-- Verificar resultado
SELECT 
    COUNT(*) as usuarios_en_auth,
    (SELECT COUNT(*) FROM public.profiles) as perfiles_existentes,
    COUNT(*) - (SELECT COUNT(*) FROM public.profiles) as usuarios_faltantes
FROM auth.users 
WHERE email IS NOT NULL;

-- Mostrar últimos usuarios sincronizados
SELECT 
    p.id,
    p.username,
    p.email,
    p.account_balance,
    p.created_at
FROM public.profiles p
ORDER BY p.updated_at DESC
LIMIT 10; 