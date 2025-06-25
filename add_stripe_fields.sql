-- Agregar campos de Stripe a la tabla profiles existente
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar campos necesarios para integración con Stripe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_premium_expires ON profiles(premium_expires_at);

-- 3. Crear tabla opcional para historial detallado de suscripciones
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    amount_paid DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Crear índices para la tabla de suscripciones
CREATE INDEX IF NOT EXISTS idx_stripe_subs_user_id ON stripe_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subs_customer_id ON stripe_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subs_subscription_id ON stripe_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subs_status ON stripe_subscriptions(status);

-- 5. Crear tabla para historial de pagos (opcional)
CREATE TABLE IF NOT EXISTS stripe_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    stripe_invoice_id TEXT UNIQUE NOT NULL,
    stripe_payment_intent_id TEXT,
    amount_paid DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Índices para pagos
CREATE INDEX IF NOT EXISTS idx_stripe_payments_user_id ON stripe_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_customer_id ON stripe_payments(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON stripe_payments(status);

-- 7. Habilitar RLS en las nuevas tablas
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;

-- 8. Crear políticas RLS para stripe_subscriptions
CREATE POLICY "Users can view own subscriptions" ON stripe_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON stripe_subscriptions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. Crear políticas RLS para stripe_payments
CREATE POLICY "Users can view own payments" ON stripe_payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments" ON stripe_payments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. Función para limpiar suscripciones expiradas (ejecutar mensualmente)
CREATE OR REPLACE FUNCTION cleanup_expired_premium()
RETURNS void AS $$
BEGIN
    -- Desactivar premium para usuarios con suscripción expirada
    UPDATE profiles 
    SET is_premium = false
    WHERE is_premium = true 
    AND premium_expires_at IS NOT NULL 
    AND premium_expires_at < NOW();
    
    -- Log de usuarios afectados
    RAISE NOTICE 'Premium cleanup completed. Affected users: %', 
        (SELECT COUNT(*) FROM profiles WHERE is_premium = false AND premium_expires_at < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Comentarios para documentación
COMMENT ON COLUMN profiles.stripe_customer_id IS 'ID del customer en Stripe para vincular pagos';
COMMENT ON COLUMN profiles.premium_expires_at IS 'Fecha de expiración de la suscripción premium';
COMMENT ON TABLE stripe_subscriptions IS 'Historial detallado de suscripciones de Stripe';
COMMENT ON TABLE stripe_payments IS 'Historial de pagos procesados por Stripe';

-- 12. Verificar que todo se creó correctamente
SELECT 
    'STRIPE INTEGRATION SETUP COMPLETED' as status,
    'Campos agregados a profiles:' as profiles_fields,
    string_agg(column_name, ', ') as new_columns
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('stripe_customer_id', 'premium_expires_at');

-- 13. Mostrar estructura final de profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position; 