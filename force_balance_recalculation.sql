-- Force balance recalculation - MANUAL FIX (CORRECTED)
-- This will manually recalculate your balance correctly

-- Step 1: First, let's see what trades you currently have
SELECT 
    'Your current trades:' as info,
    t.id,
    t.title,
    t.pnl_percentage,
    t.result,
    t.created_at
FROM trades t
JOIN profiles p ON t.user_id = p.id
WHERE p.username = 'lopezalegreiker@gmail.com'
ORDER BY t.created_at ASC;

-- Step 2: Calculate the correct balance manually
WITH your_user AS (
    SELECT id FROM profiles WHERE username = 'lopezalegreiker@gmail.com'
),
trade_stats AS (
    SELECT 
        yu.id as user_id,
        COALESCE(COUNT(t.id), 0) as total_trades,
        COALESCE(SUM(CASE WHEN t.result = 'Win' THEN 1 ELSE 0 END), 0) as wins,
        COALESCE(SUM(CASE WHEN t.result = 'Loss' THEN 1 ELSE 0 END), 0) as losses,
        COALESCE(SUM(CASE WHEN t.result = 'BE' THEN 1 ELSE 0 END), 0) as breakevens,
        COALESCE(SUM(t.pnl_percentage), 0) as total_pnl_percentage,
        COALESCE(SUM(t.pnl_pips), 0) as total_pnl_pips,
        COALESCE(SUM(t.pnl_money), 0) as total_pnl_money
    FROM your_user yu
    LEFT JOIN trades t ON t.user_id = yu.id
    GROUP BY yu.id
)
SELECT 
    'Calculated stats:' as info,
    total_trades,
    wins,
    losses,
    breakevens,
    total_pnl_percentage,
    CASE 
        WHEN total_trades = 0 THEN 1000.00
        ELSE 1000.00 + (1000.00 * total_pnl_percentage / 100.0)
    END as should_be_balance
FROM trade_stats;

-- Step 3: Update user_stats with correct values (simple approach)
UPDATE user_stats 
SET 
    total_trades = (
        SELECT COUNT(*) 
        FROM trades t 
        JOIN profiles p ON t.user_id = p.id 
        WHERE p.username = 'lopezalegreiker@gmail.com'
    ),
    wins = (
        SELECT COUNT(*) 
        FROM trades t 
        JOIN profiles p ON t.user_id = p.id 
        WHERE p.username = 'lopezalegreiker@gmail.com' AND t.result = 'Win'
    ),
    losses = (
        SELECT COUNT(*) 
        FROM trades t 
        JOIN profiles p ON t.user_id = p.id 
        WHERE p.username = 'lopezalegreiker@gmail.com' AND t.result = 'Loss'
    ),
    breakevens = (
        SELECT COUNT(*) 
        FROM trades t 
        JOIN profiles p ON t.user_id = p.id 
        WHERE p.username = 'lopezalegreiker@gmail.com' AND t.result = 'BE'
    ),
    total_pnl_percentage = (
        SELECT COALESCE(SUM(pnl_percentage), 0) 
        FROM trades t 
        JOIN profiles p ON t.user_id = p.id 
        WHERE p.username = 'lopezalegreiker@gmail.com'
    ),
    current_balance = CASE 
        WHEN (SELECT COUNT(*) FROM trades t JOIN profiles p ON t.user_id = p.id WHERE p.username = 'lopezalegreiker@gmail.com') = 0 
        THEN 1000.00
        ELSE 1000.00 + (1000.00 * (SELECT COALESCE(SUM(pnl_percentage), 0) FROM trades t JOIN profiles p ON t.user_id = p.id WHERE p.username = 'lopezalegreiker@gmail.com') / 100.0)
    END,
    updated_at = NOW()
WHERE user_id = (SELECT id FROM profiles WHERE username = 'lopezalegreiker@gmail.com');

-- Step 4: Show final result
SELECT 
    'FINAL RESULT:' as info,
    p.username,
    p.account_balance as initial_balance,
    us.current_balance,
    us.total_trades,
    us.total_pnl_percentage,
    us.updated_at
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
WHERE p.username = 'lopezalegreiker@gmail.com'; 