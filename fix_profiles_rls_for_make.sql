-- Solución para permitir acceso desde Make a la tabla profiles
-- Opción 1: Deshabilitar RLS temporalmente (MÁS FÁCIL)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Opción 2: Crear políticas más permisivas (MÁS SEGURO)
-- Si prefieres mantener RLS pero con acceso más amplio, usa estas políticas:

-- Eliminar políticas existentes restrictivas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Crear políticas más permisivas
CREATE POLICY "Allow all operations on profiles" 
ON profiles 
FOR ALL 
TO authenticated, anon
USING (true) 
WITH CHECK (true);

-- Opción 3: Política específica para service role (RECOMENDADO)
-- Esta permite acceso completo al service role (que usa Make)
CREATE POLICY "Service role full access" 
ON profiles 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Verificar que las políticas se aplicaron correctamente
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

-- Nota: Para máxima compatibilidad con Make, recomiendo usar la Opción 1 (deshabilitar RLS)
-- Si necesitas seguridad, usa la Opción 3 con service_role 