-- Check Feed Status
-- This script will verify if the feed is working correctly

-- 1. Check if is_public column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'trades' 
AND column_name = 'is_public';

-- 2. Check total trades and public trades count
SELECT 
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE is_public = true) as public_trades,
    COUNT(*) FILTER (WHERE is_public = false OR is_public IS NULL) as private_trades
FROM trades;

-- 3. Show recent public trades (if any)
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

-- 4. If no public trades, show recent trades that could be made public
SELECT 
    'Trades that could be made public:' as info,
    t.id,
    t.title,
    t.pair,
    t.result,
    t.is_public,
    t.created_at
FROM trades t
WHERE t.screenshot_url IS NOT NULL 
AND t.title IS NOT NULL 
AND t.pair IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 5; 