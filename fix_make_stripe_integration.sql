-- SOLUCIÓN COMPLETA para Make.com + Stripe
-- Maneja el caso donde customer_email puede ser NULL o no llegar correctamente

-- 1. PRIMERO: Quitar la restricción NOT NULL de username (si existe)
ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;

-- 2. Crear función robusta para Make.com que maneja emails NULL
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
    generated_username TEXT;
BEGIN
    -- Validar que el email no sea NULL o vacío
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

    -- Buscar el usuario por email
    SELECT au.id, au.email INTO found_user_id, found_email
    FROM auth.users au
    WHERE au.email = input_email;

    -- Si no encontramos el usuario
    IF found_user_id IS NULL THEN
        RETURN QUERY SELECT 
            'ERROR'::TEXT,
            NULL::UUID,
            input_email,
            NULL::TEXT,
            FALSE::BOOLEAN,
            'User not found in auth.users with email: ' || input_email::TEXT;
        RETURN;
    END IF;

    -- Generar username seguro (nunca NULL)
    generated_username := COALESCE(
        NULLIF(SPLIT_PART(found_email, '@', 1), ''),
        'user_' || SUBSTRING(found_user_id::TEXT, 1, 8)
    );

    -- Crear perfil si no existe
    INSERT INTO profiles (id, username, email, account_balance, is_premium, created_at, updated_at)
    VALUES (
        found_user_id,
        generated_username,
        found_email,
        1000.00,
        TRUE,  -- Ya es premium porque pagó
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(profiles.username, generated_username),
        email = COALESCE(profiles.email, found_email),
        is_premium = TRUE,
        updated_at = NOW();

    -- Crear estadísticas si no existen
    INSERT INTO user_stats (user_id)
    VALUES (found_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Retornar resultado exitoso
    RETURN QUERY SELECT 
        'SUCCESS'::TEXT,
        found_user_id,
        found_email,
        generated_username,
        TRUE::BOOLEAN,
        'User successfully upgraded to premium'::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'ERROR'::TEXT,
            found_user_id,
            input_email,
            NULL::TEXT,
            FALSE::BOOLEAN,
            ('Database error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear versión simple para Make.com (sin función)
-- OPCIÓN A: SQL directo que Make puede usar
/*
Para usar en Make.com, reemplaza 'STRIPE_CUSTOMER_EMAIL' con el email real:

UPDATE profiles 
SET 
    is_premium = true,
    username = COALESCE(username, SPLIT_PART('STRIPE_CUSTOMER_EMAIL', '@', 1), 'premium_user'),
    email = COALESCE(email, 'STRIPE_CUSTOMER_EMAIL'),
    updated_at = NOW()
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'STRIPE_CUSTOMER_EMAIL'
)
AND EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'STRIPE_CUSTOMER_EMAIL'
);

-- Si no existe el perfil, crearlo
INSERT INTO profiles (id, username, email, account_balance, is_premium, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(SPLIT_PART(au.email, '@', 1), 'premium_user') as username,
    au.email,
    1000.00,
    true,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'STRIPE_CUSTOMER_EMAIL'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = au.id);
*/

-- 4. Verificar que la restricción NOT NULL se quitó
SELECT 
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'username';

-- 5. Test de la función (para verificar que funciona)
-- SELECT * FROM make_user_premium_safe('test@example.com');

-- 6. Mostrar estructura actualizada
SELECT 
    'ESTRUCTURA ACTUALIZADA DE PROFILES:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position; 