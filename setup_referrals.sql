-- ===================================
-- SISTEMA DE REFERIDOS COMPLETO - TradeTrackr
-- ===================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear función para generar códigos de referido únicos
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generar código aleatorio de 6 caracteres
        new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
        
        -- Verificar si ya existe
        SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
        
        -- Si no existe, salir del loop
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar tabla profiles para incluir campos de referidos
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT generate_referral_code(),
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS referrals_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rewards_earned DECIMAL(10,2) DEFAULT 0;

-- 4. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- 5. Crear tabla de configuración de referidos
CREATE TABLE IF NOT EXISTS referral_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tier INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    referrer_reward_type TEXT NOT NULL CHECK (referrer_reward_type IN ('premium_days', 'cash_bonus', 'feature_unlock')),
    referrer_reward_value INTEGER NOT NULL,
    referred_reward_type TEXT NOT NULL CHECK (referred_reward_type IN ('premium_days', 'cash_bonus', 'feature_unlock')),
    referred_reward_value INTEGER NOT NULL,
    min_referrals_required INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Crear tabla de referidos
CREATE TABLE IF NOT EXISTS referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    referral_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    reward_tier INTEGER DEFAULT 1,
    referrer_reward_amount INTEGER DEFAULT 0,
    referred_reward_amount INTEGER DEFAULT 0,
    referrer_reward_claimed BOOLEAN DEFAULT false,
    referred_reward_claimed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referred_id) -- Un usuario solo puede ser referido una vez
);

-- 7. Crear tabla de recompensas
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('premium_days', 'cash_bonus', 'feature_unlock')),
    reward_value INTEGER NOT NULL,
    reward_description TEXT NOT NULL,
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Crear vista para estadísticas de referidos
CREATE OR REPLACE VIEW referral_stats AS
SELECT 
    p.id as user_id,
    p.username,
    p.referral_code,
    p.referrals_count,
    p.total_rewards_earned,
    COALESCE(active_refs.count, 0) as active_referrals,
    COALESCE(total_rewards.count, 0) as total_rewards,
    COALESCE(claimed_rewards.count, 0) as claimed_rewards,
    COALESCE(claimed_rewards.total_value, 0) as total_claimed_value
FROM profiles p
LEFT JOIN (
    SELECT referrer_id, COUNT(*) as count 
    FROM referrals 
    WHERE status = 'active' 
    GROUP BY referrer_id
) active_refs ON p.id = active_refs.referrer_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM referral_rewards 
    GROUP BY user_id
) total_rewards ON p.id = total_rewards.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as count, SUM(reward_value) as total_value
    FROM referral_rewards 
    WHERE claimed = true 
    GROUP BY user_id
) claimed_rewards ON p.id = claimed_rewards.user_id;

-- 9. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_claimed ON referral_rewards(claimed);

-- 10. Función para procesar un referido
CREATE OR REPLACE FUNCTION process_referral(
    referred_user_id UUID,
    referral_code_used TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    referrer_user_id UUID;
    config_record RECORD;
    referral_id UUID;
BEGIN
    -- Verificar que el código de referido existe y obtener el referrer
    SELECT id INTO referrer_user_id 
    FROM profiles 
    WHERE referral_code = referral_code_used;
    
    IF referrer_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar que el usuario no se esté refiriendo a sí mismo
    IF referrer_user_id = referred_user_id THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar que el usuario no haya sido referido antes
    IF EXISTS(SELECT 1 FROM referrals WHERE referred_id = referred_user_id) THEN
        RETURN FALSE;
    END IF;
    
    -- Obtener configuración del tier 1 (básico)
    SELECT * INTO config_record 
    FROM referral_config 
    WHERE tier = 1 AND active = true 
    LIMIT 1;
    
    IF config_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Crear el referido
    INSERT INTO referrals (
        referrer_id, 
        referred_id, 
        referral_code, 
        reward_tier,
        referrer_reward_amount,
        referred_reward_amount
    ) VALUES (
        referrer_user_id,
        referred_user_id,
        referral_code_used,
        config_record.tier,
        config_record.referrer_reward_value,
        config_record.referred_reward_value
    ) RETURNING id INTO referral_id;
    
    -- Crear recompensas para ambos usuarios
    -- Recompensa para el referrer
    INSERT INTO referral_rewards (
        user_id,
        referral_id,
        reward_type,
        reward_value,
        reward_description
    ) VALUES (
        referrer_user_id,
        referral_id,
        config_record.referrer_reward_type,
        config_record.referrer_reward_value,
        'Recompensa por referir a ' || (SELECT username FROM profiles WHERE id = referred_user_id)
    );
    
    -- Recompensa para el referido
    INSERT INTO referral_rewards (
        user_id,
        referral_id,
        reward_type,
        reward_value,
        reward_description
    ) VALUES (
        referred_user_id,
        referral_id,
        config_record.referred_reward_type,
        config_record.referred_reward_value,
        'Bonus de bienvenida por usar código de referido'
    );
    
    -- Actualizar contadores en profiles
    UPDATE profiles 
    SET referrals_count = referrals_count + 1
    WHERE id = referrer_user_id;
    
    UPDATE profiles 
    SET referred_by = referrer_user_id
    WHERE id = referred_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 11. Función para reclamar recompensas
CREATE OR REPLACE FUNCTION claim_referral_reward(
    reward_id UUID,
    claiming_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    reward_record RECORD;
BEGIN
    -- Obtener la recompensa y verificar que pertenece al usuario
    SELECT * INTO reward_record 
    FROM referral_rewards 
    WHERE id = reward_id AND user_id = claiming_user_id AND claimed = false;
    
    IF reward_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Marcar como reclamada
    UPDATE referral_rewards 
    SET claimed = true, claimed_at = NOW()
    WHERE id = reward_id;
    
    -- Si es recompensa de días premium, actualizar el perfil
    IF reward_record.reward_type = 'premium_days' THEN
        UPDATE profiles 
        SET 
            is_premium = true,
            premium_expires_at = CASE 
                WHEN premium_expires_at IS NULL OR premium_expires_at < NOW() 
                THEN NOW() + INTERVAL '1 day' * reward_record.reward_value
                ELSE premium_expires_at + INTERVAL '1 day' * reward_record.reward_value
            END,
            total_rewards_earned = total_rewards_earned + reward_record.reward_value
        WHERE id = claiming_user_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 12. Trigger para generar código de referido automáticamente
CREATE OR REPLACE FUNCTION ensure_referral_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_referral_code
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_referral_code();

-- 13. Insertar configuración inicial de tiers
INSERT INTO referral_config (tier, name, description, referrer_reward_type, referrer_reward_value, referred_reward_type, referred_reward_value, min_referrals_required) VALUES
(1, 'Principiante', 'Tu primer referido - ¡Bienvenido al programa!', 'premium_days', 3, 'premium_days', 3, 1),
(2, 'Embajador', 'Has referido a 5 personas - ¡Eres un embajador!', 'premium_days', 7, 'premium_days', 5, 5),
(3, 'Leyenda', 'Has referido a 10 personas - ¡Eres una leyenda!', 'premium_days', 15, 'premium_days', 7, 10)
ON CONFLICT DO NOTHING;

-- 14. Habilitar RLS (Row Level Security)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_config ENABLE ROW LEVEL SECURITY;

-- 15. Políticas de seguridad para referrals
CREATE POLICY "Users can view their own referrals as referrer" ON referrals
    FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view their own referrals as referred" ON referrals
    FOR SELECT USING (auth.uid() = referred_id);

-- 16. Políticas de seguridad para referral_rewards
CREATE POLICY "Users can view their own rewards" ON referral_rewards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards" ON referral_rewards
    FOR UPDATE USING (auth.uid() = user_id);

-- 17. Políticas de seguridad para referral_config (solo lectura)
CREATE POLICY "Anyone can view active referral config" ON referral_config
    FOR SELECT USING (active = true);

-- 18. Actualizar códigos de referido para usuarios existentes
UPDATE profiles 
SET referral_code = generate_referral_code() 
WHERE referral_code IS NULL;

-- ===================================
-- SISTEMA DE REFERIDOS COMPLETADO
-- ===================================

-- Verificar instalación
SELECT 'Referral system installed successfully!' as status; 