-- Crear tabla trade_advices para almacenar consejos de IA
CREATE TABLE IF NOT EXISTS public.trade_advices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    advice TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_trade_advices_user_id ON public.trade_advices(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_advices_created_at ON public.trade_advices(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.trade_advices ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver sus propios consejos
CREATE POLICY "Users can view their own trade advices" ON public.trade_advices
    FOR SELECT USING (auth.uid() = user_id);

-- Política para que los usuarios puedan insertar sus propios consejos
CREATE POLICY "Users can insert their own trade advices" ON public.trade_advices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios puedan actualizar sus propios consejos
CREATE POLICY "Users can update their own trade advices" ON public.trade_advices
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para que los usuarios puedan eliminar sus propios consejos
CREATE POLICY "Users can delete their own trade advices" ON public.trade_advices
    FOR DELETE USING (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en trade_advices
CREATE TRIGGER update_trade_advices_updated_at 
    BEFORE UPDATE ON public.trade_advices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar algunos consejos de ejemplo (opcional - eliminar en producción)
-- INSERT INTO public.trade_advices (user_id, advice) VALUES 
-- ('tu-user-id-aqui', 'Basándome en tu último trade, te recomiendo establecer un stop loss más conservador. Tu ratio riesgo/beneficio de 1:3 es excelente, pero considera reducir el tamaño de posición en mercados volátiles.'),
-- ('tu-user-id-aqui', 'He notado que tus trades alcistas han tenido mejor rendimiento. Considera enfocarte más en oportunidades de compra cuando el mercado muestre señales de fortaleza.');

-- Comentarios para documentación
COMMENT ON TABLE public.trade_advices IS 'Tabla para almacenar consejos personalizados de IA para cada usuario';
COMMENT ON COLUMN public.trade_advices.user_id IS 'ID del usuario al que pertenece el consejo';
COMMENT ON COLUMN public.trade_advices.advice IS 'Texto del consejo personalizado generado por IA';
COMMENT ON COLUMN public.trade_advices.created_at IS 'Fecha y hora de creación del consejo';
COMMENT ON COLUMN public.trade_advices.updated_at IS 'Fecha y hora de última actualización del consejo'; 