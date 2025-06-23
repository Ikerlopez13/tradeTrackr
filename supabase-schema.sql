-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT,
    avatar_url TEXT,
    is_pro BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trades table
CREATE TABLE public.trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    pair TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    session TEXT,
    bias TEXT,
    risk_reward TEXT NOT NULL,
    result TEXT NOT NULL,
    feeling INTEGER NOT NULL,
    description TEXT,
    screenshot_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_stats table
CREATE TABLE public.user_stats (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    break_even_trades INTEGER DEFAULT 0,
    win_rate NUMERIC DEFAULT 0,
    profit_factor NUMERIC DEFAULT 0,
    average_rr NUMERIC DEFAULT 0,
    best_day_percentage NUMERIC DEFAULT 0,
    max_drawdown NUMERIC DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for trades
CREATE POLICY "Users can view own trades" ON public.trades
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON public.trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON public.trades
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON public.trades
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_stats
CREATE POLICY "Users can view own stats" ON public.user_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON public.user_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.user_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user stats when a trade is inserted/updated/deleted
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    user_uuid UUID;
    total_count INTEGER;
    win_count INTEGER;
    loss_count INTEGER;
    be_count INTEGER;
    win_percentage NUMERIC;
BEGIN
    -- Get user_id from the trade
    IF TG_OP = 'DELETE' THEN
        user_uuid := OLD.user_id;
    ELSE
        user_uuid := NEW.user_id;
    END IF;
    
    -- Calculate stats
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE result = 'win'),
        COUNT(*) FILTER (WHERE result = 'loss'),
        COUNT(*) FILTER (WHERE result = 'be')
    INTO total_count, win_count, loss_count, be_count
    FROM public.trades
    WHERE user_id = user_uuid;
    
    -- Calculate win rate
    IF total_count > 0 THEN
        win_percentage := (win_count::NUMERIC / total_count::NUMERIC) * 100;
    ELSE
        win_percentage := 0;
    END IF;
    
    -- Update user stats
    INSERT INTO public.user_stats (
        user_id, 
        total_trades, 
        winning_trades, 
        losing_trades, 
        break_even_trades, 
        win_rate,
        last_updated
    )
    VALUES (
        user_uuid, 
        total_count, 
        win_count, 
        loss_count, 
        be_count, 
        win_percentage,
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
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update stats when trades change
CREATE OR REPLACE TRIGGER on_trade_change
    AFTER INSERT OR UPDATE OR DELETE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.update_user_stats();

-- Create indexes for better performance
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_created_at ON public.trades(created_at DESC);
CREATE INDEX idx_trades_result ON public.trades(result);
CREATE INDEX idx_profiles_username ON public.profiles(username); 