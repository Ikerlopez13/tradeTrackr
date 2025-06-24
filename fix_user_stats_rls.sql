-- Arreglar el problema de RLS en user_stats
-- El trigger está fallando porque las funciones SECURITY DEFINER no pueden bypassear RLS automáticamente

-- Opción 1: Hacer la función más específica para bypassear RLS
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
  total_trades_count INTEGER;
  winning_trades_count INTEGER;
  losing_trades_count INTEGER;
  be_trades_count INTEGER;
  calculated_win_rate DECIMAL(5,2);
  target_user_id UUID;
BEGIN
  -- Obtener el user_id del trade
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;
  
  -- Contar trades por resultado
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE result = 'win'),
    COUNT(*) FILTER (WHERE result = 'loss'),
    COUNT(*) FILTER (WHERE result = 'be')
  INTO 
    total_trades_count,
    winning_trades_count,
    losing_trades_count,
    be_trades_count
  FROM trades 
  WHERE user_id = target_user_id;
  
  -- Calcular win rate
  calculated_win_rate := CASE 
    WHEN total_trades_count > 0 THEN 
      ROUND((winning_trades_count::DECIMAL / total_trades_count::DECIMAL) * 100, 2)
    ELSE 0 
  END;
  
  -- Actualizar estadísticas usando una consulta que bypassea RLS
  PERFORM pg_catalog.set_config('row_security', 'off', true);
  
  INSERT INTO user_stats (
    user_id,
    total_trades,
    winning_trades,
    losing_trades,
    break_even_trades,
    win_rate,
    last_updated
  )
  VALUES (
    target_user_id,
    total_trades_count,
    winning_trades_count,
    losing_trades_count,
    be_trades_count,
    calculated_win_rate,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    winning_trades = EXCLUDED.winning_trades,
    losing_trades = EXCLUDED.losing_trades,
    break_even_trades = EXCLUDED.break_even_trades,
    win_rate = EXCLUDED.win_rate,
    last_updated = EXCLUDED.last_updated;
    
  PERFORM pg_catalog.set_config('row_security', 'on', true);
    
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_trade_change ON trades;
CREATE TRIGGER on_trade_change
  AFTER INSERT OR UPDATE OR DELETE ON trades
  FOR EACH ROW EXECUTE FUNCTION public.update_user_stats(); 