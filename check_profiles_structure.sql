-- Verificar la estructura real de la tabla profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver algunos registros de ejemplo (si existen)
SELECT * FROM profiles LIMIT 3; 