-- SOLUCIÓN RÁPIDA: Deshabilitar RLS en la tabla profiles para Make
-- Esto permitirá que Make acceda sin problemas a la tabla

-- 1. Deshabilitar Row Level Security
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que se deshabilitó correctamente
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Resultado esperado: rowsecurity = false

-- Si necesitas volver a habilitar RLS más tarde, usa:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; 