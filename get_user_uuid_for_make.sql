-- CONSULTA RÁPIDA: Obtener UUID para usar en Make
-- Solo consulta auth.users para evitar problemas con columnas que no existen

SELECT 
    id as "🔑 UUID_PARA_MAKE",
    email as "📧 Email_Confirmacion",
    '👆 Copia este UUID para Make' as "📋 Instrucciones"
FROM auth.users 
WHERE email = 'ikerlopezcontacto@gmail.com';

-- ⚠️  PASOS PARA MAKE:
-- 1. Ejecuta esta consulta en Supabase SQL Editor
-- 2. Copia el UUID de la primera columna
-- 3. Pégalo en Make donde está usando tu email
-- 4. El UUID se ve así: a1b2c3d4-e5f6-7890-abcd-ef1234567890 