-- Script para obtener el user_id y recalcular estadísticas manualmente
-- Corregido para usar auth.users en lugar de profiles.email

-- 1. Primero ver el estado actual (antes del arreglo)
SELECT 
    'ANTES DEL ARREGLO:' as status,
    au.id as user_id,
    au.email,
    p.account_balance as balance_inicial,
    us.total_trades,
    us.total_pnl_percentage,
    us.total_pnl_money,
    us.current_balance as balance_actual_incorrecto,
    us.updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE au.email = 'ikerlopezalegre@gmail.com';

-- 2. Recalcular estadísticas para tu usuario específico
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Obtener tu user_id desde auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'ikerlopezalegre@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Ejecutar el recálculo
        PERFORM recalculate_user_stats(target_user_id);
        RAISE NOTICE 'Estadísticas recalculadas para usuario: %', target_user_id;
    ELSE
        RAISE NOTICE 'Usuario no encontrado con email: ikerlopezalegre@gmail.com';
    END IF;
END;
$$;

-- 3. Ver el estado después del arreglo
SELECT 
    'DESPUÉS DEL ARREGLO:' as status,
    au.id as user_id,
    au.email,
    p.account_balance as balance_inicial,
    us.total_trades,
    us.total_pnl_percentage,
    us.total_pnl_money,
    us.current_balance as balance_actual_correcto,
    us.updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN user_stats us ON au.id = us.user_id
WHERE au.email = 'ikerlopezalegre@gmail.com';

-- 4. Verificar que la matemática sea correcta
SELECT 
    'VERIFICACIÓN MATEMÁTICA:' as status,
    p.account_balance as balance_inicial,
    us.total_pnl_percentage as pnl_porcentaje,
    (p.account_balance * (1 + us.total_pnl_percentage/100)) as balance_calculado_manualmente,
    us.current_balance as balance_en_bd,
    CASE 
        WHEN ABS((p.account_balance * (1 + us.total_pnl_percentage/100)) - us.current_balance) < 0.01 
        THEN '✅ CORRECTO' 
        ELSE '❌ INCORRECTO' 
    END as verificacion
FROM auth.users au
JOIN profiles p ON au.id = p.id
JOIN user_stats us ON au.id = us.user_id
WHERE au.email = 'ikerlopezalegre@gmail.com'; 