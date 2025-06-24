-- Agregar columna confidence a la tabla trades
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100);

-- Comentario para el nuevo campo
COMMENT ON COLUMN trades.confidence IS 'Nivel de confianza del trader en el trade (0-100)';

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_trades_confidence ON trades(confidence); 