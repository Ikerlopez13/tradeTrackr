-- Script para verificar y corregir valores de result en trades
-- Problema potencial: case sensitivity en los valores 'Win', 'Loss', 'BE'

-- 1. Verificar todos los valores únicos de result
SELECT 
    'VALORES ÚNICOS DE RESULT' as titulo,
    result,
    COUNT(*) as cantidad,
    CASE 
        WHEN result = 'Win' THEN '✅ Correcto'
        WHEN result = 'Loss' THEN '✅ Correcto'
        WHEN result = 'BE' THEN '✅ Correcto'
        WHEN result = 'win' THEN '⚠️ Minúscula'
        WHEN result = 'loss' THEN '⚠️ Minúscula'
        WHEN result = 'be' THEN '⚠️ Minúscula'
        ELSE '❌ Valor incorrecto'
    END as estado
FROM trades
GROUP BY result
ORDER BY result;

-- 2. Corregir valores en minúsculas si existen
UPDATE trades 
SET result = 'Win' 
WHERE result = 'win';

UPDATE trades 
SET result = 'Loss' 
WHERE result = 'loss';

UPDATE trades 
SET result = 'BE' 
WHERE result = 'be';

-- 3. Verificar después de la corrección
SELECT 
    'VALORES DESPUÉS DE CORRECCIÓN' as titulo,
    result,
    COUNT(*) as cantidad
FROM trades
GROUP BY result
ORDER BY result;

-- 4. Mostrar algunos trades de ejemplo con sus resultados
SELECT 
    'EJEMPLOS DE TRADES' as titulo,
    id,
    user_id,
    result,
    pnl_percentage,
    pnl_pips,
    pnl_money,
    created_at
FROM trades
ORDER BY created_at DESC
LIMIT 15;

-- 5. Verificar si hay valores NULL o vacíos
SELECT 
    'VALORES NULOS O VACÍOS' as titulo,
    COUNT(*) as total_trades,
    COUNT(CASE WHEN result IS NULL THEN 1 END) as result_nulos,
    COUNT(CASE WHEN result = '' THEN 1 END) as result_vacios,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as user_id_nulos
FROM trades;

SELECT 'Verificación de valores result completada!' as status; 