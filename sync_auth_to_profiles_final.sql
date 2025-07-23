-- Script FINAL CORREGIDO para sincronizar usuarios de auth.users con profiles
-- Versión que soluciona todos los errores de tipos de datos

-- 1. Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    email,
    avatar_url,
    account_balance,
    is_premium,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    1000.00, -- Balance inicial
    false,   -- No premium por defecto
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger que se ejecuta automáticamente cuando se crea un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Función SIMPLIFICADA para sincronizar usuarios existentes
CREATE OR REPLACE FUNCTION public.sync_all_auth_users()
RETURNS TEXT AS $$
DECLARE
  total_count INTEGER := 0;
  result_text TEXT;
BEGIN
  -- Sincronizar todos los usuarios de una vez usando INSERT ... ON CONFLICT
  INSERT INTO public.profiles (
    id,
    username,
    email,
    avatar_url,
    account_balance,
    is_premium,
    created_at,
    updated_at
  )
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'username', au.email),
    au.email,
    au.raw_user_meta_data->>'avatar_url',
    1000.00,
    false,
    au.created_at,
    NOW()
  FROM auth.users au
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, profiles.username),
    updated_at = NOW();
  
  -- Contar usuarios totales
  SELECT COUNT(*) INTO total_count FROM auth.users;
  
  result_text := format('Sincronización completada: %s usuarios procesados desde auth.users', total_count);
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función CORREGIDA para verificar usuarios faltantes (sin tipos específicos)
CREATE OR REPLACE FUNCTION public.check_missing_profiles()
RETURNS TABLE(
  user_id UUID,
  user_email VARCHAR,
  user_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email::VARCHAR,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Ejecutar sincronización inmediata
SELECT public.sync_all_auth_users();

-- 6. Verificar resultados
SELECT 
  'Usuarios en auth.users' as tabla,
  COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
  'Perfiles en profiles' as tabla,
  COUNT(*) as total
FROM public.profiles
UNION ALL
SELECT 
  'Usuarios sin perfil' as tabla,
  COUNT(*) as total
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 7. Mostrar usuarios faltantes (si los hay)
SELECT * FROM public.check_missing_profiles();

-- 8. Comandos de utilidad (copia estos para usar después):
/*

-- ✅ COMANDOS ÚTILES PARA COPIAR Y USAR:

-- Sincronizar todos los usuarios:
SELECT public.sync_all_auth_users();

-- Ver usuarios faltantes:
SELECT * FROM public.check_missing_profiles();

-- Ver estadísticas rápidas:
SELECT 
  (SELECT COUNT(*) FROM auth.users) as usuarios_auth,
  (SELECT COUNT(*) FROM public.profiles) as perfiles_creados,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.profiles p ON au.id = p.id WHERE p.id IS NULL) as usuarios_sin_perfil;

-- Crear perfil para un usuario específico:
INSERT INTO public.profiles (id, username, email, account_balance, is_premium)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'username', email),
  email,
  1000.00,
  false
FROM auth.users 
WHERE id = 'PONER_USER_ID_AQUI'
ON CONFLICT (id) DO NOTHING;

-- Ver estructura de la tabla profiles:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

*/ 