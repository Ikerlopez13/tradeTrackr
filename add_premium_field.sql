-- Agregar campo is_premium a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;

-- Comentario para el campo
COMMENT ON COLUMN profiles.is_premium IS 'Indica si el usuario tiene suscripción premium activa';

-- Crear índice para optimizar consultas
CREATE INDEX idx_profiles_is_premium ON profiles(is_premium); 