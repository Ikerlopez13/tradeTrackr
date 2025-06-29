-- Actualizar sistema de leaderboards con nuevas funcionalidades
-- 1. Función para salirse de un grupo
-- 2. Asegurar que los datos se actualicen en tiempo real

-- 1. Función para salirse de un grupo
CREATE OR REPLACE FUNCTION leave_group(
    user_id_param UUID,
    group_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    admin_count INTEGER;
BEGIN
    -- Verificar que el usuario es miembro del grupo
    SELECT role INTO user_role 
    FROM group_memberships 
    WHERE group_id = group_id_param AND user_id = user_id_param;
    
    IF user_role IS NULL THEN
        RETURN FALSE; -- Usuario no es miembro del grupo
    END IF;
    
    -- Si el usuario es admin, verificar que no sea el único admin
    IF user_role = 'admin' THEN
        SELECT COUNT(*) INTO admin_count 
        FROM group_memberships 
        WHERE group_id = group_id_param AND role = 'admin';
        
        -- Si es el único admin y hay otros miembros, no puede salirse
        IF admin_count = 1 THEN
            DECLARE
                total_members INTEGER;
            BEGIN
                SELECT COUNT(*) INTO total_members 
                FROM group_memberships 
                WHERE group_id = group_id_param;
                
                IF total_members > 1 THEN
                    -- Transferir admin a otro miembro aleatorio
                    UPDATE group_memberships 
                    SET role = 'admin' 
                    WHERE group_id = group_id_param 
                    AND user_id != user_id_param 
                    AND role = 'member'
                    AND id = (
                        SELECT id FROM group_memberships 
                        WHERE group_id = group_id_param 
                        AND user_id != user_id_param 
                        AND role = 'member'
                        ORDER BY joined_at ASC 
                        LIMIT 1
                    );
                END IF;
            END;
        END IF;
    END IF;
    
    -- Eliminar al usuario del grupo
    DELETE FROM group_memberships 
    WHERE group_id = group_id_param AND user_id = user_id_param;
    
    -- Si no quedan miembros, eliminar el grupo
    IF NOT EXISTS(SELECT 1 FROM group_memberships WHERE group_id = group_id_param) THEN
        DELETE FROM friend_groups WHERE id = group_id_param;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizar la vista de group_leaderboard para asegurar datos actuales
-- La vista ya usa LEFT JOIN con user_stats, lo que significa que siempre obtiene los datos más actuales
-- Pero vamos a agregar un trigger para actualizar automáticamente cuando cambien los stats

-- 3. Función para refrescar los rankings cuando se actualicen las estadísticas
CREATE OR REPLACE FUNCTION refresh_group_rankings()
RETURNS TRIGGER AS $$
BEGIN
    -- Esta función se ejecutará cuando se actualicen user_stats
    -- Los rankings se actualizarán automáticamente porque usamos vistas
    -- No necesitamos hacer nada específico aquí, solo notificar que cambió
    PERFORM pg_notify('leaderboard_update', NEW.user_id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger para actualizar rankings automáticamente
DROP TRIGGER IF EXISTS trigger_refresh_rankings ON user_stats;
CREATE TRIGGER trigger_refresh_rankings
    AFTER UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION refresh_group_rankings();

-- 5. Agregar política RLS para permitir que los usuarios salgan de grupos
DROP POLICY IF EXISTS "Users can leave groups" ON group_memberships;
CREATE POLICY "Users can leave groups" ON group_memberships
    FOR DELETE USING (user_id = auth.uid());

-- 6. Función para obtener el rol del usuario en un grupo específico
CREATE OR REPLACE FUNCTION get_user_role_in_group(
    user_id_param UUID,
    group_id_param UUID
) RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM group_memberships 
    WHERE group_id = group_id_param AND user_id = user_id_param;
    
    RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Vista mejorada para mostrar información completa de grupos del usuario
CREATE OR REPLACE VIEW user_groups_detailed AS
SELECT 
    fg.id,
    fg.name,
    fg.description,
    fg.created_by,
    fg.invite_code,
    fg.is_public,
    fg.max_members,
    fg.created_at,
    fg.updated_at,
    gm.role as user_role,
    gm.joined_at,
    (SELECT COUNT(*) FROM group_memberships WHERE group_id = fg.id) as member_count,
    (SELECT COUNT(*) FROM group_memberships gm2 
     JOIN user_stats us ON gm2.user_id = us.user_id 
     WHERE gm2.group_id = fg.id AND us.total_trades > 0) as active_traders,
    p_creator.username as creator_username
FROM friend_groups fg
JOIN group_memberships gm ON fg.id = gm.group_id
LEFT JOIN profiles p_creator ON fg.created_by = p_creator.id
WHERE gm.user_id = auth.uid();

-- Confirmar actualización
SELECT 'Sistema de leaderboards actualizado con funcionalidad para salir de grupos!' as status; 