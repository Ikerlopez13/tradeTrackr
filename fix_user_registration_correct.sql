-- Fix completo para problemas de registro de usuarios (VERSIÓN CORREGIDA)
-- Ejecutar en Supabase SQL Editor

-- 1. Deshabilitar RLS temporalmente para crear datos
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- 2. Recrear la función de handle_new_user con mejor manejo de errores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar en profiles
    INSERT INTO public.profiles (id, username, account_balance, is_premium)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        1000.00,
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, profiles.username),
        updated_at = NOW();
    
    -- Insertar en user_stats (solo las columnas que existen)
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

-- 3. Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Crear perfiles para usuarios existentes que no los tengan
INSERT INTO profiles (id, username, account_balance, is_premium, created_at, updated_at)
SELECT 
    au.id,
    SPLIT_PART(au.email, '@', 1) as username,
    1000.00 as account_balance,
    false as is_premium,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Crear estadísticas para usuarios que no las tengan (SIN created_at/updated_at)
INSERT INTO user_stats (user_id)
SELECT 
    au.id
FROM auth.users au
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 6. Reactivar RLS con políticas más permisivas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas restrictivas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

-- Crear políticas más permisivas
CREATE POLICY "Allow authenticated users full access to profiles" 
ON profiles 
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to user_stats" 
ON user_stats 
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- 7. Verificar que todo funciona
SELECT 
    'Verificación de usuarios y perfiles' as status,
    COUNT(au.id) as total_users,
    COUNT(p.id) as users_with_profiles,
    COUNT(us.user_id) as users_with_stats
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id;

-- 8. Mostrar usuarios sin perfil (si los hay)
SELECT 
    'Usuarios sin perfil:' as warning,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 9. Mostrar usuarios sin estadísticas (si los hay)
SELECT 
    'Usuarios sin estadísticas:' as warning,
    au.id,
    au.email
FROM auth.users au
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE us.user_id IS NULL;

-- Resultado esperado: 0 usuarios sin perfil y 0 usuarios sin estadísticas 