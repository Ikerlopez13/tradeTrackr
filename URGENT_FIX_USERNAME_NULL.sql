-- 🚨 ARREGLO URGENTE PARA USERNAME NULL
-- ⚠️ EJECUTAR INMEDIATAMENTE EN SUPABASE SQL EDITOR
-- Este script arregla el error que está rompiendo Make.com

-- 1. ARREGLAR TODOS LOS USERNAMES NULL AHORA MISMO
UPDATE profiles 
SET username = SPLIT_PART(
    (SELECT email FROM auth.users WHERE id = profiles.id), 
    '@', 1
),
updated_at = NOW()
WHERE username IS NULL;

-- 2. VERIFICAR QUE SE ARREGLARON
SELECT 
    'USERNAMES NULL RESTANTES:' as status,
    COUNT(*) as cantidad
FROM profiles 
WHERE username IS NULL;

-- 3. CREAR FUNCIÓN ROBUSTA PARA MAKE.COM
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
            'Email is NULL or empty'::TEXT;
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
            'User not found'::TEXT;
        RETURN;
    END IF;

    -- Generar username seguro
    safe_username := COALESCE(
        NULLIF(SPLIT_PART(found_email, '@', 1), ''),
        'user_' || SUBSTRING(found_user_id::TEXT, 1, 8)
    );

    -- Crear/actualizar perfil con username GARANTIZADO
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
        username = COALESCE(EXCLUDED.username, safe_username),
        is_premium = TRUE,
        updated_at = NOW();

    -- Retornar éxito
    RETURN QUERY SELECT 
        'SUCCESS'::TEXT,
        found_user_id,
        found_email,
        safe_username,
        TRUE::BOOLEAN,
        'User made premium successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. VERIFICAR RESULTADO FINAL
SELECT 
    'ESTADO FINAL:' as info,
    COUNT(*) as total_profiles,
    COUNT(username) as con_username,
    COUNT(*) - COUNT(username) as sin_username
FROM profiles; 