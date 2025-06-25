-- Corregir tabla profiles para incluir email y mejorar integración con Stripe
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna email a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Actualizar perfiles existentes con los emails de auth.users
UPDATE profiles 
SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id
AND profiles.email IS NULL;

-- 3. Recrear la función handle_new_user para guardar email completo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar en profiles con email completo
    INSERT INTO public.profiles (id, username, email, account_balance, is_premium)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email,  -- ✅ GUARDAR EMAIL COMPLETO
        1000.00,
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, profiles.username),
        email = EXCLUDED.email,  -- ✅ ACTUALIZAR EMAIL TAMBIÉN
        updated_at = NOW();
    
    -- Insertar en user_stats
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error pero no fallar
        RAISE WARNING 'Error en handle_new_user para %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Crear índice para email en profiles (importante para Stripe)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 6. Comentario para documentación
COMMENT ON COLUMN profiles.email IS 'Email del usuario - usado para integración con Stripe';

-- 7. Verificar que todos los usuarios tienen email en profiles
SELECT 
    'VERIFICACIÓN DE EMAILS' as status,
    COUNT(*) as total_profiles,
    COUNT(email) as profiles_with_email,
    COUNT(*) - COUNT(email) as profiles_without_email
FROM profiles;

-- 8. Mostrar usuarios que no tienen email (si los hay)
SELECT 
    'USUARIOS SIN EMAIL:' as warning,
    p.id,
    p.username,
    au.email as auth_email,
    p.email as profile_email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.email IS NULL;

-- 9. Mostrar estructura actualizada de profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 10. Verificar que los datos se ven correctos ahora
SELECT 
    p.username,
    p.email,
    p.is_premium,
    p.account_balance,
    au.email as auth_email
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC
LIMIT 10; 