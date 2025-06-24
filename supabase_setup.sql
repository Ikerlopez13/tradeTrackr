-- Crear tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT,
  referral_code TEXT UNIQUE,
  referrals_count INTEGER DEFAULT 0,
  rewards_count INTEGER DEFAULT 0,
  pro_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de trades (actualizada)
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  pair TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  session TEXT,
  bias TEXT NOT NULL,
  risk_reward TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'be')),
  feeling INTEGER NOT NULL CHECK (feeling >= 0 AND feeling <= 100),
  description TEXT,
  screenshot_url TEXT,
  confluences TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de estadísticas de usuario
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  break_even_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  profit_factor DECIMAL(10,2) DEFAULT 0,
  expectancy DECIMAL(10,2) DEFAULT 0,
  avg_risk_reward DECIMAL(10,2) DEFAULT 0,
  best_day_pnl DECIMAL(10,2) DEFAULT 0,
  worst_day_pnl DECIMAL(10,2) DEFAULT 0,
  max_drawdown DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Crear tabla de rendimiento mensual
CREATE TABLE IF NOT EXISTS monthly_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  return_percentage DECIMAL(10,2) DEFAULT 0,
  trades_count INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- Crear tabla de referidos
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  reward_earned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- Crear bucket de almacenamiento para screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para trades
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para user_stats
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para monthly_performance
CREATE POLICY "Users can view own monthly performance" ON monthly_performance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly performance" ON monthly_performance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly performance" ON monthly_performance
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para referrals
CREATE POLICY "Users can view referrals they made" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view referrals they received" ON referrals
  FOR SELECT USING (auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- Políticas para Storage (screenshots)
CREATE POLICY "Users can upload own screenshots" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trade-screenshots' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own screenshots" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trade-screenshots' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own screenshots" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'trade-screenshots' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own screenshots" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'trade-screenshots' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    UPPER(LEFT(MD5(RANDOM()::TEXT), 6))
  );
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar estadísticas cuando se inserta/actualiza un trade
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
  total_trades_count INTEGER;
  winning_trades_count INTEGER;
  losing_trades_count INTEGER;
  be_trades_count INTEGER;
  calculated_win_rate DECIMAL(5,2);
BEGIN
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
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Calcular win rate
  calculated_win_rate := CASE 
    WHEN total_trades_count > 0 THEN 
      ROUND((winning_trades_count::DECIMAL / total_trades_count::DECIMAL) * 100, 2)
    ELSE 0 
  END;
  
  -- Actualizar estadísticas
  INSERT INTO user_stats (
    user_id,
    total_trades,
    winning_trades,
    losing_trades,
    break_even_trades,
    win_rate
  )
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    total_trades_count,
    winning_trades_count,
    losing_trades_count,
    be_trades_count,
    calculated_win_rate
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    winning_trades = EXCLUDED.winning_trades,
    losing_trades = EXCLUDED.losing_trades,
    break_even_trades = EXCLUDED.break_even_trades,
    win_rate = EXCLUDED.win_rate,
    updated_at = NOW();
    
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para actualizar estadísticas
DROP TRIGGER IF EXISTS on_trade_change ON trades;
CREATE TRIGGER on_trade_change
  AFTER INSERT OR UPDATE OR DELETE ON trades
  FOR EACH ROW EXECUTE FUNCTION public.update_user_stats();

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_result ON trades(result);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_performance_user_id ON monthly_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_performance_date ON monthly_performance(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- Insertar datos de ejemplo para testing (opcional)
-- INSERT INTO auth.users (id, email) VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com'); 