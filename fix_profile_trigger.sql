-- 🔧 SCRIPT PARA ARREGLAR EL TRIGGER DE CREACIÓN AUTOMÁTICA DE PERFILES
-- Este script verifica y corrige el trigger que debería crear perfiles automáticamente

-- 1. VERIFICAR ESTADO ACTUAL DEL TRIGGER
SELECT 
    '🔍 DIAGNÓSTICO DEL TRIGGER' as "VERIFICACIÓN",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger t
            JOIN pg_proc p ON t.tgfoid = p.oid
            WHERE t.tgname = 'on_auth_user_created'
            AND t.tgenabled = 'O'
        ) THEN '✅ TRIGGER ACTIVO'
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger t
            WHERE t.tgname = 'on_auth_user_created'
            AND t.tgenabled = 'D'
        ) THEN '❌ TRIGGER DESHABILITADO'
        ELSE '❌ TRIGGER NO EXISTE'
    END as "ESTADO_TRIGGER",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'handle_new_user'
        ) THEN '✅ FUNCIÓN EXISTE'
        ELSE '❌ FUNCIÓN NO EXISTE'
    END as "ESTADO_FUNCIÓN";

-- 2. VER DETALLES DEL TRIGGER ACTUAL (si existe)
SELECT 
    '📋 DETALLES DEL TRIGGER' as "INFO",
    t.tgname as "NOMBRE_TRIGGER",
    CASE 
        WHEN t.tgenabled = 'O' THEN '✅ ACTIVO'
        WHEN t.tgenabled = 'D' THEN '❌ DESHABILITADO' 
        ELSE '⚠️ ESTADO DESCONOCIDO'
    END as "ESTADO",
    p.proname as "FUNCIÓN_ASOCIADA",
    pg_get_triggerdef(t.oid) as "DEFINICIÓN_COMPLETA"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- 3. ELIMINAR TRIGGER EXISTENTE (por si está corrupto)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. RECREAR LA FUNCIÓN HANDLE_NEW_USER MEJORADA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Log del nuevo usuario (para debugging)
    RAISE NOTICE 'Creando perfil para usuario: % (email: %)', NEW.id, NEW.email;
    
    -- Insertar en profiles con manejo de errores
    INSERT INTO public.profiles (
        id, 
        username, 
        account_balance, 
        is_premium, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username', 
            SPLIT_PART(NEW.email, '@', 1)
        ),
        1000.00,  -- Balance inicial
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, profiles.username),
        updated_at = NOW();
    
    -- Insertar en user_stats con manejo de errores  
    INSERT INTO public.user_stats (
        user_id,
        total_trades,
        wins,
        losses,
        breakevens,
        winning_trades,
        losing_trades,
        break_even_trades,
        total_pnl_percentage,
        total_pnl_pips,
        total_pnl_money,
        current_balance,
        updated_at
    )
    VALUES (
        NEW.id,
        0, 0, 0, 0, 0, 0, 0,  -- Contadores en 0
        0.00, 0.00, 0.00,     -- PnL en 0
        1000.00,              -- Balance inicial
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();
    
    RAISE NOTICE 'Perfil creado exitosamente para: %', NEW.email;
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error pero no fallar la autenticación
        RAISE WARNING 'Error al crear perfil para % (%): %', NEW.email, NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RECREAR EL TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 6. VERIFICAR QUE EL TRIGGER SE CREÓ CORRECTAMENTE
SELECT 
    '✅ VERIFICACIÓN POST-CREACIÓN' as "RESULTADO",
    t.tgname as "NOMBRE_TRIGGER",
    CASE 
        WHEN t.tgenabled = 'O' THEN '✅ ACTIVO'
        ELSE '❌ PROBLEMA'
    END as "ESTADO",
    p.proname as "FUNCIÓN"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid  
WHERE t.tgname = 'on_auth_user_created';

-- 7. PROBAR EL TRIGGER (simulación - NO ejecutar en producción)
/*
-- ⚠️ SOLO PARA TESTING - NO EJECUTAR EN PRODUCCIÓN
-- Este INSERT simularía un nuevo usuario para probar el trigger

INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'test-trigger@example.com',
    crypt('password', gen_salt('bf')),
    NOW(),
    '{"username": "testuser"}',
    NOW(),
    NOW()
);
*/

-- 8. MOSTRAR ESTADÍSTICAS FINALES
SELECT 
    '📊 ESTADÍSTICAS FINALES' as "RESUMEN",
    COUNT(au.id) as "TOTAL_USUARIOS",
    COUNT(p.id) as "CON_PERFIL",
    COUNT(us.user_id) as "CON_STATS",
    COUNT(au.id) - COUNT(p.id) as "SIN_PERFIL",
    CASE 
        WHEN COUNT(au.id) = COUNT(p.id) THEN '🎉 TODOS TIENEN PERFIL'
        ELSE '⚠️ HAY USUARIOS SIN PERFIL'
    END as "ESTADO_GENERAL"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id  
LEFT JOIN user_stats us ON au.id = us.user_id; 