-- Crear tabla de likes para trades
CREATE TABLE IF NOT EXISTS trade_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trade_id, user_id)
);

-- Crear tabla de comentarios para trades
CREATE TABLE IF NOT EXISTS trade_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_trade_likes_trade_id ON trade_likes(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_likes_user_id ON trade_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_comments_trade_id ON trade_comments(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_comments_user_id ON trade_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_comments_created_at ON trade_comments(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE trade_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para likes
CREATE POLICY "Users can view all likes on public trades" ON trade_likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trades 
            WHERE trades.id = trade_likes.trade_id 
            AND trades.is_public = true
        )
    );

CREATE POLICY "Users can manage their own likes" ON trade_likes
    FOR ALL USING (auth.uid() = user_id);

-- Políticas de seguridad para comentarios
CREATE POLICY "Users can view all comments on public trades" ON trade_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trades 
            WHERE trades.id = trade_comments.trade_id 
            AND trades.is_public = true
        )
    );

CREATE POLICY "Users can insert comments on public trades" ON trade_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM trades 
            WHERE trades.id = trade_comments.trade_id 
            AND trades.is_public = true
        )
    );

CREATE POLICY "Users can update their own comments" ON trade_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON trade_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Actualizar la vista del feed público para incluir likes y comentarios
CREATE OR REPLACE VIEW public_trades_feed AS
SELECT 
    t.id,
    t.title,
    t.pair,
    t.timeframe,
    t.bias,
    t.result,
    t.risk_reward,
    t.pnl_percentage,
    t.pnl_pips,
    t.pnl_money,
    t.screenshot_url,
    t.created_at,
    p.username,
    p.avatar_url,
    us.wins,
    us.losses,
    us.win_rate,
    us.total_pnl_percentage,
    COALESCE(likes.count, 0) as likes_count,
    COALESCE(comments.count, 0) as comments_count
FROM trades t
JOIN profiles p ON t.user_id = p.id
LEFT JOIN user_stats us ON t.user_id = us.user_id
LEFT JOIN (
    SELECT trade_id, COUNT(*) as count
    FROM trade_likes
    GROUP BY trade_id
) likes ON t.id = likes.trade_id
LEFT JOIN (
    SELECT trade_id, COUNT(*) as count
    FROM trade_comments
    GROUP BY trade_id
) comments ON t.id = comments.trade_id
WHERE t.is_public = TRUE
ORDER BY t.created_at DESC; 