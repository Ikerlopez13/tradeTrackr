-- SQL para Make.com: Convertir usuario a Premium usando email de Stripe
-- Este query busca el usuario por email y lo hace premium

-- Actualizar usuario a premium usando el email que viene de Stripe
UPDATE profiles 
SET 
    is_premium = true,
    updated_at = NOW()
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'EMAIL_FROM_STRIPE'  -- Make reemplazará esto con el email real
);

-- Verificar que se actualizó correctamente
SELECT 
    p.id,
    p.username,
    au.email,
    p.is_premium,
    p.updated_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'EMAIL_FROM_STRIPE';  -- Make reemplazará esto también 