-- Solución para el error UUID en Make
-- Make está intentando usar email como UUID, necesitamos obtener el UUID real

-- 1. Ver la estructura de auth.users para entender los campos
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'ikerlopezcontacto@gmail.com';

-- 2. Ver si existe un perfil para este usuario (profiles no tiene email, solo auth.users)
SELECT 
    p.id,
    p.username,
    au.email,
    p.is_pro,
    p.created_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'ikerlopezcontacto@gmail.com';

-- 3. Si no existe perfil, crearlo con el UUID correcto
INSERT INTO profiles (
    id,
    username,
    is_pro
)
SELECT 
    au.id,  -- UUID real del usuario
    split_part(au.email, '@', 1) as username,  -- Usar parte antes del @ como username
    false as is_pro
FROM auth.users au
WHERE au.email = 'ikerlopezcontacto@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = au.id
);

-- 4. Verificar que se creó correctamente
SELECT 
    p.*,
    au.email as auth_email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'ikerlopezcontacto@gmail.com';

-- IMPORTANTE: Para Make, necesitas usar el UUID (campo 'id'), NO el email
-- El UUID se ve algo así: 12345678-1234-1234-1234-123456789abc 