-- SOLUCIÓN COMPLETA para Make.com con Stripe
-- Maneja todos los casos: crear perfil si no existe + hacer premium

-- 1. Crear perfil si no existe (usando email de Stripe)
INSERT INTO profiles (id, username, is_premium, account_balance, created_at, updated_at)
SELECT 
    au.id,
    SPLIT_PART(au.email, '@', 1) as username,  -- usar parte antes del @ como username
    true as is_premium,  -- ya es premium porque pagó
    1000.00 as account_balance,  -- balance inicial
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
WHERE au.email = 'EMAIL_FROM_STRIPE'  -- Make reemplazará esto
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = au.id)
ON CONFLICT (id) DO NOTHING;

-- 2. Actualizar a premium si ya existe el perfil
UPDATE profiles 
SET 
    is_premium = true,
    updated_at = NOW()
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'EMAIL_FROM_STRIPE'  -- Make reemplazará esto
);

-- 3. Crear estadísticas iniciales si no existen
INSERT INTO user_stats (user_id, created_at, updated_at)
SELECT 
    au.id,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'EMAIL_FROM_STRIPE'  -- Make reemplazará esto
AND NOT EXISTS (SELECT 1 FROM user_stats WHERE user_id = au.id)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Verificar resultado final
SELECT 
    'SUCCESS: Usuario actualizado a Premium' as status,
    au.email,
    p.username,
    p.is_premium,
    p.account_balance,
    p.updated_at
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE au.email = 'EMAIL_FROM_STRIPE';  -- Make reemplazará esto 