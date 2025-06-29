-- Script de diagnóstico para encontrar qué pasó con las membresías de grupos

-- 1. Verificar si existen grupos en la base de datos
SELECT 
    'Grupos existentes:' as check_type,
    id,
    name,
    description,
    created_by,
    invite_code,
    is_public,
    created_at,
    (SELECT COUNT(*) FROM group_memberships WHERE group_id = fg.id) as member_count
FROM friend_groups fg
ORDER BY created_at DESC;

-- 2. Verificar todas las membresías existentes
SELECT 
    'Todas las membresías:' as check_type,
    gm.id,
    gm.group_id,
    gm.user_id,
    gm.role,
    gm.joined_at,
    fg.name as group_name,
    p.username as user_username
FROM group_memberships gm
LEFT JOIN friend_groups fg ON gm.group_id = fg.id
LEFT JOIN profiles p ON gm.user_id = p.id
ORDER BY gm.joined_at DESC;

-- 3. Verificar el ID del usuario actual
SELECT 
    'Usuario actual:' as check_type,
    auth.uid() as current_user_id;

-- 4. Buscar membresías del usuario actual (por si hay algún problema con RLS)
SELECT 
    'Membresías del usuario actual:' as check_type,
    gm.*,
    fg.name as group_name
FROM group_memberships gm
JOIN friend_groups fg ON gm.group_id = fg.id
WHERE gm.user_id = auth.uid();

-- 5. Verificar si la función leave_group existe y funciona
SELECT 
    'Función leave_group existe:' as check_type,
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'leave_group';

-- 6. Verificar políticas RLS activas
SELECT 
    'Políticas RLS en group_memberships:' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'group_memberships'; 