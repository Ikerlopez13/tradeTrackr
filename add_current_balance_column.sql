-- Agregar columna current_balance a la tabla user_stats
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(15,2) DEFAULT 1000;

-- Comentario para el nuevo campo
COMMENT ON COLUMN user_stats.current_balance IS 'Balance actual calculado automáticamente basado en P&L';

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_stats_current_balance ON user_stats(current_balance);

-- Inicializar current_balance para usuarios existentes
UPDATE user_stats 
SET current_balance = 1000 
WHERE current_balance IS NULL; 