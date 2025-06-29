-- Script para verificar qué columnas existen realmente en user_stats

-- 1. Verificar todas las columnas de user_stats
SELECT 
    'Columnas en user_stats:' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar todas las columnas de profiles
SELECT 
    'Columnas en profiles:' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Mostrar algunos datos de ejemplo de user_stats
SELECT 
    'Datos de ejemplo user_stats:' as check_type,
    *
FROM user_stats
LIMIT 3; 