-- Agregar columna updated_at a la tabla user_stats
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Comentario para el nuevo campo
COMMENT ON COLUMN user_stats.updated_at IS 'Fecha y hora de la última actualización de estadísticas';

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_stats_updated_at ON user_stats(updated_at);

-- Inicializar updated_at para registros existentes
UPDATE user_stats 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- Verificar que se creó correctamente
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
AND column_name = 'updated_at'; 