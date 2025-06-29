-- 🔍 SCRIPT PARA ENCONTRAR USUARIOS SIN PERFIL
-- Ejecutar en Supabase SQL Editor

-- 1. DIAGNÓSTICO: Usuarios registrados pero sin perfil
SELECT 
    '🔍 USUARIOS SIN PERFIL EN PROFILES' as "DIAGNÓSTICO",
    au.id as "🔑 USER_ID",
    au.email as "📧 EMAIL", 
    au.created_at as "📅 FECHA_REGISTRO",
    au.email_confirmed_at as "✅ EMAIL_CONFIRMADO",
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
        ELSE '❌ No confirmado'
    END as "ESTADO_EMAIL",
    CASE 
        WHEN p.id IS NULL THEN '❌ FALTA PERFIL' 
        ELSE '✅ PERFIL EXISTE' 
    END as "ESTADO_PERFIL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Solo usuarios SIN perfil
ORDER BY au.created_at DESC;

-- 2. ESTADÍSTICAS RÁPIDAS
SELECT 
    '📊 RESUMEN ESTADÍSTICAS' as "TIPO",
    COUNT(au.id) as "👥 TOTAL_USUARIOS_AUTH",
    COUNT(p.id) as "👤 USUARIOS_CON_PERFIL", 
    COUNT(au.id) - COUNT(p.id) as "❌ USUARIOS_SIN_PERFIL",
    ROUND(
        (COUNT(p.id)::numeric / NULLIF(COUNT(au.id), 0)::numeric) * 100, 2
    ) as "📈 PORCENTAJE_CON_PERFIL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id;

-- 3. DETALLE DE USUARIOS SIN PERFIL (con más info)
SELECT 
    '📋 USUARIOS PARA CREAR PERFILES' as "ACCIÓN_NECESARIA",
    au.id as "UUID_PARA_INSERTAR",
    au.email as "EMAIL",
    SPLIT_PART(au.email, '@', 1) as "USERNAME_SUGERIDO",
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'SI'
        ELSE 'NO'
    END as "EMAIL_CONFIRMADO",
    au.created_at as "FECHA_REGISTRO",
    EXTRACT(DAYS FROM NOW() - au.created_at) as "DÍAS_SIN_PERFIL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at ASC;

-- 4. VERIFICAR TRIGGER DE CREACIÓN AUTOMÁTICA
SELECT 
    '🔧 ESTADO DEL TRIGGER' as "VERIFICACIÓN",
    t.tgname as "NOMBRE_TRIGGER",
    CASE 
        WHEN t.tgenabled = 'O' THEN '✅ ACTIVO'
        WHEN t.tgenabled = 'D' THEN '❌ DESHABILITADO'
        ELSE '⚠️ ESTADO DESCONOCIDO'
    END as "ESTADO",
    p.proname as "FUNCIÓN_ASOCIADA"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- 5. SCRIPT PARA CREAR PERFILES FALTANTES (ejecutar solo si es necesario)
/*
-- ⚠️ DESCOMENTAR Y EJECUTAR SOLO SI QUIERES CREAR TODOS LOS PERFILES FALTANTES

INSERT INTO profiles (id, username, account_balance, is_premium, created_at, updated_at)
SELECT 
    au.id,
    SPLIT_PART(au.email, '@', 1) as username,
    1000.00 as account_balance,  -- Balance inicial por defecto
    false as is_premium,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Solo usuarios sin perfil
ON CONFLICT (id) DO NOTHING;

-- Crear estadísticas para usuarios sin stats
INSERT INTO user_stats (user_id)
SELECT au.id
FROM auth.users au
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
*/ 