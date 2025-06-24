-- Verificar estructura de la tabla profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar si existen registros en profiles
SELECT 
    id,
    username,
    account_balance,
    is_premium,
    created_at,
    updated_at
FROM profiles
LIMIT 5;

-- Verificar políticas RLS en la tabla profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Verificar si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles'; 