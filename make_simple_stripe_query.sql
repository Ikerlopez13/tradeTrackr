-- SQL SIMPLE para Make.com - Stripe Integration
-- Reemplaza 'CUSTOMER_EMAIL_FROM_STRIPE' con el email real del webhook

-- PASO 1: Actualizar usuario existente a premium
UPDATE profiles 
SET 
    is_premium = true,
    username = COALESCE(
        username, 
        SPLIT_PART('CUSTOMER_EMAIL_FROM_STRIPE', '@', 1),
        'premium_user'
    ),
    email = COALESCE(email, 'CUSTOMER_EMAIL_FROM_STRIPE'),
    updated_at = NOW()
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'CUSTOMER_EMAIL_FROM_STRIPE'
    LIMIT 1
);

-- PASO 2: Crear perfil si no existe
INSERT INTO profiles (id, username, email, account_balance, is_premium, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(
        SPLIT_PART(au.email, '@', 1),
        'premium_user'
    ) as username,
    au.email,
    1000.00,
    true,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'CUSTOMER_EMAIL_FROM_STRIPE'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = au.id)
LIMIT 1;

-- PASO 3: Crear estadísticas si no existen
INSERT INTO user_stats (user_id)
SELECT au.id
FROM auth.users au
WHERE au.email = 'CUSTOMER_EMAIL_FROM_STRIPE'
AND NOT EXISTS (SELECT 1 FROM user_stats WHERE user_id = au.id)
LIMIT 1;

-- PASO 4: Verificar resultado
SELECT 
    'SUCCESS' as status,
    au.email,
    p.username,
    p.is_premium,
    p.account_balance,
    p.updated_at
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE au.email = 'CUSTOMER_EMAIL_FROM_STRIPE'; 