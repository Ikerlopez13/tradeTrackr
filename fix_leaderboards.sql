-- Script para diagnosticar y arreglar las tablas de leaderboards

-- 1. Verificar si las tablas existen
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'friend_groups') THEN
        RAISE NOTICE 'La tabla friend_groups YA EXISTE';
        
        -- Verificar si la columna is_public existe
        IF EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'friend_groups' AND column_name = 'is_public') THEN
            RAISE NOTICE 'La columna is_public YA EXISTE en friend_groups';
        ELSE
            RAISE NOTICE 'La columna is_public NO EXISTE en friend_groups - AGREGANDO...';
            ALTER TABLE friend_groups ADD COLUMN is_public BOOLEAN DEFAULT false;
        END IF;
    ELSE
        RAISE NOTICE 'La tabla friend_groups NO EXISTE - CREANDO...';
    END IF;
END $$;

-- 2. Crear tabla friend_groups si no existe
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

-- 3. Crear tabla group_memberships si no existe
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 4. Crear función para crear grupos
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

-- 5. Crear función para unirse a grupos
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
        RETURN FALSE;
    END IF;
    
    -- Verificar si el usuario ya es miembro
    IF EXISTS(
        SELECT 1 FROM group_memberships 
        WHERE group_id = group_record.id AND user_id = user_id_param
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar límite de miembros
    SELECT COUNT(*) INTO member_count 
    FROM group_memberships 
    WHERE group_id = group_record.id;
    
    IF member_count >= group_record.max_members THEN
        RETURN FALSE;
    END IF;
    
    -- Unirse al grupo
    INSERT INTO group_memberships (group_id, user_id, role)
    VALUES (group_record.id, user_id_param, 'member');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Habilitar RLS
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- 7. Políticas básicas de seguridad
DROP POLICY IF EXISTS "Users can view groups they belong to" ON friend_groups;
CREATE POLICY "Users can view groups they belong to" ON friend_groups
    FOR SELECT USING (
        id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid()
        ) OR is_public = true
    );

DROP POLICY IF EXISTS "Users can create groups" ON friend_groups;
CREATE POLICY "Users can create groups" ON friend_groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can view group memberships" ON group_memberships;
CREATE POLICY "Users can view group memberships" ON group_memberships
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can join groups" ON group_memberships;
CREATE POLICY "Users can join groups" ON group_memberships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mensaje de confirmación
SELECT 'Tablas de leaderboards creadas/reparadas exitosamente!' as status; 