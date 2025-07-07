-- Make trades public - Direct fix for feed
-- This script will add the is_public column and make trades public

-- 1. Add the is_public column if it doesn't exist
ALTER TABLE trades ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- 2. Update some existing trades to be public (trades with screenshots)
UPDATE trades 
SET is_public = true 
WHERE screenshot_url IS NOT NULL 
AND title IS NOT NULL 
AND pair IS NOT NULL
AND LENGTH(title) > 0
AND LENGTH(pair) > 0;

-- 3. Show results
SELECT 
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE is_public = true) as public_trades,
    COUNT(*) FILTER (WHERE is_public = false OR is_public IS NULL) as private_trades
FROM trades;

-- 4. Show the public trades that should appear in feed
SELECT 
    t.id,
    t.title,
    t.pair,
    t.result,
    t.is_public,
    t.created_at,
    p.username
FROM trades t
LEFT JOIN profiles p ON t.user_id = p.id
WHERE t.is_public = true
ORDER BY t.created_at DESC
LIMIT 10; 