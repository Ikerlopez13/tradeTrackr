-- SCRIPT PARA CORREGIR USUARIOS PREMIUM
-- Solo estos 4 emails deben ser Premium, el resto vuelven a ser usuarios normales

-- Primero, ver cuántos usuarios Premium hay actualmente
SELECT 
    COUNT(*) as total_premium_users,
    array_agg(email) as premium_emails
FROM profiles 
WHERE is_premium = true;

-- Hacer que TODOS los usuarios sean NO premium primero
UPDATE profiles 
SET is_premium = false 
WHERE is_premium = true;

-- Ahora hacer Premium SOLO a los 4 emails específicos
UPDATE profiles 
SET is_premium = true 
WHERE email IN (
    'lopezalegreiker@gmail.com',
    'sergiocarpio1303@gmail.com', 
    'denismonroyalvarez11@gmail.com',
    'arnaupozasren@gmail.com'
);

-- Verificar que solo estos 4 usuarios son Premium
SELECT 
    email,
    username,
    is_premium,
    created_at
FROM profiles 
WHERE is_premium = true
ORDER BY email;

-- Verificar el total de usuarios Premium (debe ser 4)
SELECT COUNT(*) as total_premium_after_fix FROM profiles WHERE is_premium = true;

-- Mostrar todos los usuarios no premium para confirmar
SELECT 
    COUNT(*) as total_non_premium_users
FROM profiles 
WHERE is_premium = false; 