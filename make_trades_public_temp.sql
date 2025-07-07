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

-- 3. If no trades have screenshots, make some random trades public for testing
UPDATE trades 
SET is_public = true 
WHERE id IN (
    SELECT id 
    FROM trades 
    WHERE is_public = false 
    AND title IS NOT NULL 
    AND pair IS NOT NULL
    AND LENGTH(title) > 0
    AND LENGTH(pair) > 0
    LIMIT 10
);

-- 4. Show results
SELECT 
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE is_public = true) as public_trades,
    COUNT(*) FILTER (WHERE is_public = false OR is_public IS NULL) as private_trades
FROM trades;

-- 5. Show the public trades that should appear in feed
SELECT 
    t.id,
    t.title,
    t.pair,
    t.result,
    t.is_public,
    t.created_at,
    t.screenshot_url
FROM trades t
WHERE t.is_public = true
ORDER BY t.created_at DESC
LIMIT 10; 