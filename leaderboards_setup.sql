-- ===================================
-- SISTEMA DE LEADERBOARDS CON GRUPOS DE AMIGOS - TradeTrackr
-- ===================================

-- 1. Tabla de grupos de amigos
CREATE TABLE IF NOT EXISTS friend_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
    is_public BOOLEAN DEFAULT false,
    max_members INTEGER DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de membresías de grupos
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 3. Tabla de invitaciones a grupos
CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Vista para leaderboards globales
CREATE OR REPLACE VIEW global_leaderboard AS
SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.is_premium,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    CASE 
        WHEN us.total_trades > 0 
        THEN ROUND((us.wins::DECIMAL / us.total_trades::DECIMAL) * 100, 2)
        ELSE 0 
    END as win_rate,
    us.total_pnl_percentage,
    us.current_balance,
    CASE 
        WHEN us.current_balance > 0 
        THEN ROUND(((us.current_balance - 1000) / 1000) * 100, 2)
        ELSE 0 
    END as total_return_percentage,
    p.created_at as user_since,
    ROW_NUMBER() OVER (ORDER BY us.current_balance DESC) as balance_rank,
    ROW_NUMBER() OVER (ORDER BY 
        CASE 
            WHEN us.total_trades > 0 
            THEN (us.wins::DECIMAL / us.total_trades::DECIMAL) * 100
            ELSE 0 
        END DESC
    ) as winrate_rank,
    ROW_NUMBER() OVER (ORDER BY us.total_trades DESC) as volume_rank
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
WHERE us.total_trades > 0
ORDER BY us.current_balance DESC;

-- 5. Vista para leaderboards por grupo
CREATE OR REPLACE VIEW group_leaderboard AS
SELECT 
    fg.id as group_id,
    fg.name as group_name,
    p.id as user_id,
    p.username,
    p.avatar_url,
    p.is_premium,
    us.total_trades,
    us.wins,
    us.losses,
    us.breakevens,
    CASE 
        WHEN us.total_trades > 0 
        THEN ROUND((us.wins::DECIMAL / us.total_trades::DECIMAL) * 100, 2)
        ELSE 0 
    END as win_rate,
    us.total_pnl_percentage,
    us.current_balance,
    CASE 
        WHEN us.current_balance > 0 
        THEN ROUND(((us.current_balance - 1000) / 1000) * 100, 2)
        ELSE 0 
    END as total_return_percentage,
    gm.joined_at,
    gm.role,
    ROW_NUMBER() OVER (
        PARTITION BY fg.id 
        ORDER BY us.current_balance DESC
    ) as group_rank,
    ROW_NUMBER() OVER (
        PARTITION BY fg.id 
        ORDER BY 
            CASE 
                WHEN us.total_trades > 0 
                THEN (us.wins::DECIMAL / us.total_trades::DECIMAL) * 100
                ELSE 0 
            END DESC
    ) as group_winrate_rank
FROM friend_groups fg
JOIN group_memberships gm ON fg.id = gm.group_id
JOIN profiles p ON gm.user_id = p.id
LEFT JOIN user_stats us ON p.id = us.user_id
WHERE us.total_trades > 0
ORDER BY fg.id, us.current_balance DESC;

-- 6. Función para unirse a un grupo con código de invitación
CREATE OR REPLACE FUNCTION join_group_with_code(
    user_id_param UUID,
    invite_code_param TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    group_record RECORD;
    member_count INTEGER;
BEGIN
    -- Buscar el grupo por código de invitación
    SELECT * INTO group_record 
    FROM friend_groups 
    WHERE invite_code = invite_code_param;
    
    IF group_record IS NULL THEN
        RETURN FALSE; -- Código inválido
    END IF;
    
    -- Verificar si el usuario ya es miembro
    IF EXISTS(
        SELECT 1 FROM group_memberships 
        WHERE group_id = group_record.id AND user_id = user_id_param
    ) THEN
        RETURN FALSE; -- Ya es miembro
    END IF;
    
    -- Verificar límite de miembros
    SELECT COUNT(*) INTO member_count 
    FROM group_memberships 
    WHERE group_id = group_record.id;
    
    IF member_count >= group_record.max_members THEN
        RETURN FALSE; -- Grupo lleno
    END IF;
    
    -- Unirse al grupo
    INSERT INTO group_memberships (group_id, user_id, role)
    VALUES (group_record.id, user_id_param, 'member');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para crear un nuevo grupo
CREATE OR REPLACE FUNCTION create_friend_group(
    creator_id UUID,
    group_name TEXT,
    group_description TEXT DEFAULT NULL,
    is_public_param BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    new_group_id UUID;
BEGIN
    -- Crear el grupo
    INSERT INTO friend_groups (name, description, created_by, is_public)
    VALUES (group_name, group_description, creator_id, is_public_param)
    RETURNING id INTO new_group_id;
    
    -- Agregar al creador como admin
    INSERT INTO group_memberships (group_id, user_id, role)
    VALUES (new_group_id, creator_id, 'admin');
    
    RETURN new_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_friend_groups_invite_code ON friend_groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_friend_groups_created_by ON friend_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invited_user_id ON group_invitations(invited_user_id);

-- 9. Habilitar RLS (Row Level Security)
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- 10. Políticas de seguridad para friend_groups
CREATE POLICY "Users can view groups they belong to" ON friend_groups
    FOR SELECT USING (
        id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid()
        ) OR is_public = true
    );

CREATE POLICY "Users can create groups" ON friend_groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" ON friend_groups
    FOR UPDATE USING (
        id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Group admins can delete groups" ON friend_groups
    FOR DELETE USING (
        id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 11. Políticas de seguridad para group_memberships
CREATE POLICY "Users can view group memberships" ON group_memberships
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join groups" ON group_memberships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON group_memberships
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Group admins can manage memberships" ON group_memberships
    FOR ALL USING (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

-- 12. Políticas de seguridad para group_invitations
CREATE POLICY "Users can view their invitations" ON group_invitations
    FOR SELECT USING (
        invited_user_id = auth.uid() OR 
        invited_by = auth.uid() OR
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Group members can create invitations" ON group_invitations
    FOR INSERT WITH CHECK (
        auth.uid() = invited_by AND
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- 13. Función para obtener estadísticas de un grupo
CREATE OR REPLACE FUNCTION get_group_stats(group_id_param UUID)
RETURNS TABLE(
    total_members INTEGER,
    total_trades INTEGER,
    avg_win_rate DECIMAL,
    top_performer TEXT,
    group_total_pnl DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT gm.user_id)::INTEGER as total_members,
        COALESCE(SUM(us.total_trades), 0)::INTEGER as total_trades,
        CASE 
            WHEN COUNT(DISTINCT gm.user_id) > 0 
            THEN ROUND(AVG(
                CASE 
                    WHEN us.total_trades > 0 
                    THEN (us.wins::DECIMAL / us.total_trades::DECIMAL) * 100
                    ELSE 0 
                END
            ), 2)
            ELSE 0::DECIMAL 
        END as avg_win_rate,
        (
            SELECT p.username 
            FROM group_memberships gm2
            JOIN profiles p ON gm2.user_id = p.id
            LEFT JOIN user_stats us2 ON p.id = us2.user_id
            WHERE gm2.group_id = group_id_param
            ORDER BY us2.current_balance DESC NULLS LAST
            LIMIT 1
        )::TEXT as top_performer,
        COALESCE(SUM(us.total_pnl_percentage), 0)::DECIMAL as group_total_pnl
    FROM group_memberships gm
    LEFT JOIN user_stats us ON gm.user_id = us.user_id
    WHERE gm.group_id = group_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- SISTEMA DE LEADERBOARDS COMPLETADO
-- ===================================

-- Verificar instalación
SELECT 'Leaderboards system installed successfully!' as status; 