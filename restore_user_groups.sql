-- Script para restaurar membresías de grupos si fueron eliminadas accidentalmente

-- PASO 1: Ejecutar solo si necesitas restaurar tu membresía
-- Primero, identifica tu user_id ejecutando: SELECT auth.uid();

-- PASO 2: Si hay grupos sin miembros, puedes volver a unirte usando el código de invitación
-- O si eres el creador, restaurar tu membresía como admin

-- Ejemplo: Restaurar membresía como admin en un grupo específico
-- REEMPLAZA 'TU_USER_ID_AQUI' con tu ID real y 'GROUP_ID_AQUI' con el ID del grupo
/*
INSERT INTO group_memberships (group_id, user_id, role, joined_at)
VALUES (
    'GROUP_ID_AQUI',  -- ID del grupo
    'TU_USER_ID_AQUI',  -- Tu user ID
    'admin',  -- o 'member'
    NOW()
)
ON CONFLICT (group_id, user_id) DO NOTHING;
*/

-- PASO 3: Verificar que la restauración funcionó
SELECT 
    'Verificación post-restauración:' as check_type,
    gm.id,
    gm.group_id,
    gm.user_id,
    gm.role,
    fg.name as group_name
FROM group_memberships gm
JOIN friend_groups fg ON gm.group_id = fg.id
WHERE gm.user_id = auth.uid();

-- PASO 4: Si necesitas recrear un grupo completamente (solo si se eliminó)
/*
-- Ejemplo de recreación de grupo
INSERT INTO friend_groups (
    id,
    name,
    description,
    created_by,
    invite_code,
    is_public,
    max_members,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Nombre del Grupo',
    'Descripción del grupo',
    auth.uid(),
    upper(substring(gen_random_uuid()::text from 1 for 8)),
    false,
    50,
    NOW(),
    NOW()
) RETURNING id;

-- Luego agregar membresía
INSERT INTO group_memberships (group_id, user_id, role, joined_at)
VALUES (
    (SELECT id FROM friend_groups WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    auth.uid(),
    'admin',
    NOW()
);
*/ 