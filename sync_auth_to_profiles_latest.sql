-- Script para sincronizar usuarios de auth.users con la tabla profiles
-- Incluye trigger automático y función de sincronización manual

-- 1. Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    email,
    full_name,
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
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

-- 3. Función para sincronizar TODOS los usuarios existentes manualmente
CREATE OR REPLACE FUNCTION public.sync_all_auth_users()
RETURNS TEXT AS $$
DECLARE
  user_record RECORD;
  inserted_count INTEGER := 0;
  updated_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  -- Contar usuarios totales en auth
  SELECT COUNT(*) INTO total_count FROM auth.users;
  
  -- Iterar sobre todos los usuarios de auth.users
  FOR user_record IN 
    SELECT 
      id,
      email,
      raw_user_meta_data,
      created_at,
      updated_at
    FROM auth.users
  LOOP
    -- Intentar insertar o actualizar cada usuario
    INSERT INTO public.profiles (
      id,
      username,
      email,
      full_name,
      avatar_url,
      account_balance,
      is_premium,
      created_at,
      updated_at
    )
    VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'username', user_record.email),
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
      user_record.raw_user_meta_data->>'avatar_url',
      1000.00,
      false,
      user_record.created_at,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      username = COALESCE(EXCLUDED.username, profiles.username),
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      updated_at = NOW();
    
    -- Verificar si fue inserción o actualización
    IF FOUND THEN
      -- Verificar si el registro ya existía
      IF (SELECT COUNT(*) FROM public.profiles WHERE id = user_record.id) = 1 THEN
        IF (SELECT updated_at FROM public.profiles WHERE id = user_record.id) = NOW() THEN
          updated_count := updated_count + 1;
        END IF;
      ELSE
        inserted_count := inserted_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN format('Sincronización completada: %s usuarios en auth.users, %s perfiles insertados, %s perfiles actualizados', 
                total_count, inserted_count, updated_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para verificar usuarios faltantes
CREATE OR REPLACE FUNCTION public.check_missing_profiles()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
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

-- 8. Script para ejecutar manualmente cuando sea necesario
/*
-- Para sincronizar todos los usuarios nuevamente:
SELECT public.sync_all_auth_users();

-- Para verificar usuarios faltantes:
SELECT * FROM public.check_missing_profiles();

-- Para crear un perfil específico manualmente:
INSERT INTO public.profiles (id, username, email, full_name, account_balance, is_premium)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'username', email),
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  1000.00,
  false
FROM auth.users 
WHERE id = 'TU_USER_ID_AQUI'
ON CONFLICT (id) DO NOTHING;
*/ 