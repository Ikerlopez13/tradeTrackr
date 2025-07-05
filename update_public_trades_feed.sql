-- Update public_trades_feed view to include is_premium field
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
    p.is_premium,
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