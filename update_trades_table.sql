-- Agregar nuevos campos a la tabla trades
ALTER TABLE trades 
ADD COLUMN confluences TEXT,
ADD COLUMN pnl_percentage DECIMAL(10,2),
ADD COLUMN pnl_pips DECIMAL(10,2);

-- Comentarios para los nuevos campos
COMMENT ON COLUMN trades.confluences IS 'Confluencias que llevaron a tomar el trade';
COMMENT ON COLUMN trades.pnl_percentage IS 'Ganancia/pérdida en porcentaje';
COMMENT ON COLUMN trades.pnl_pips IS 'Ganancia/pérdida en pips';

-- Agregar campo de balance inicial a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN account_balance DECIMAL(15,2) DEFAULT 1000.00;

-- Comentario para el balance
COMMENT ON COLUMN profiles.account_balance IS 'Balance actual de la cuenta de trading';

-- Crear función para actualizar el balance automáticamente
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar si hay un porcentaje de P&L
    IF NEW.pnl_percentage IS NOT NULL THEN
        UPDATE profiles 
        SET account_balance = account_balance * (1 + (NEW.pnl_percentage / 100))
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para actualizar balance automáticamente
CREATE TRIGGER trigger_update_balance
    AFTER INSERT ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

-- Crear índices para optimizar consultas
CREATE INDEX idx_trades_pnl_percentage ON trades(pnl_percentage);
CREATE INDEX idx_trades_confluences ON trades USING gin(to_tsvector('spanish', confluences));
CREATE INDEX idx_profiles_account_balance ON profiles(account_balance); 