-- Fix account balance and recalculate everything
-- Step 1: Reset your account balance to 1000
UPDATE profiles 
SET account_balance = 1000.00 
WHERE username = 'lopezalegreiker@gmail.com';

-- Step 2: Force recalculation of user_stats
-- This will trigger the updated function with the correct initial balance
UPDATE trades 
SET updated_at = NOW() 
WHERE user_id = (SELECT id FROM profiles WHERE username = 'lopezalegreiker@gmail.com')
AND id = (
    SELECT id FROM trades 
    WHERE user_id = (SELECT id FROM profiles WHERE username = 'lopezalegreiker@gmail.com')
    ORDER BY created_at ASC 
    LIMIT 1
);

-- Step 3: Check current trades for your user
SELECT 
    t.id,
    t.title,
    t.pnl_percentage,
    t.result,
    t.created_at
FROM trades t
JOIN profiles p ON t.user_id = p.id
WHERE p.username = 'lopezalegreiker@gmail.com'
ORDER BY t.created_at ASC;

-- Step 4: Show final result
SELECT 
    p.id,
    p.username,
    p.account_balance as initial_balance,
    us.current_balance,
    us.total_trades,
    us.total_pnl_percentage
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
WHERE p.username = 'lopezalegreiker@gmail.com'; 