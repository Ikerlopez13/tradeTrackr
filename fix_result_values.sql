-- Script para arreglar los valores de result en la base de datos
-- Convertir de mayúsculas a minúsculas para coincidir con la restricción CHECK

-- 1. Verificar valores actuales antes de la corrección
SELECT 
    'VALORES ANTES DE LA CORRECCIÓN' as titulo,
    result,
    COUNT(*) as cantidad,
    CASE 
        WHEN result IN ('win', 'loss', 'be') THEN '✅ Correcto'
        WHEN result IN ('Win', 'Loss', 'BE') THEN '⚠️ Necesita corrección'
        ELSE '❌ Valor inválido'
    END as estado
FROM trades
GROUP BY result
ORDER BY result;

-- 2. Corregir valores de mayúsculas a minúsculas
UPDATE trades 
SET result = 'win' 
WHERE result = 'Win';

UPDATE trades 
SET result = 'loss' 
WHERE result = 'Loss';

UPDATE trades 
SET result = 'be' 
WHERE result = 'BE';

-- 3. Verificar después de la corrección
SELECT 
    'VALORES DESPUÉS DE LA CORRECCIÓN' as titulo,
    result,
    COUNT(*) as cantidad,
    CASE 
        WHEN result IN ('win', 'loss', 'be') THEN '✅ Correcto'
        ELSE '❌ Valor inválido'
    END as estado
FROM trades
GROUP BY result
ORDER BY result;

-- 4. Verificar que no hay valores NULL o vacíos
SELECT 
    'VERIFICACIÓN DE VALORES NULOS' as titulo,
    COUNT(*) as total_trades,
    COUNT(CASE WHEN result IS NULL THEN 1 END) as result_nulos,
    COUNT(CASE WHEN result = '' THEN 1 END) as result_vacios,
    COUNT(CASE WHEN result NOT IN ('win', 'loss', 'be') THEN 1 END) as result_invalidos
FROM trades;

-- 5. Mostrar algunos trades de ejemplo
SELECT 
    'EJEMPLOS DE TRADES CORREGIDOS' as titulo,
    id,
    user_id,
    title,
    result,
    pnl_percentage,
    created_at
FROM trades
ORDER BY created_at DESC
LIMIT 10;

SELECT 'Corrección de valores result completada!' as status; 