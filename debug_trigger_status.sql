-- Debug trigger status and test deletion
-- Step 1: Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trades';

-- Step 2: Check current trades for your user
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

-- Step 3: Check current stats
SELECT 
    p.username,
    p.account_balance as initial_balance,
    us.current_balance,
    us.total_trades,
    us.total_pnl_percentage,
    us.updated_at
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
WHERE p.username = 'lopezalegreiker@gmail.com';

-- Step 4: Manual recalculation to see what SHOULD be the balance
-- Get user ID first
WITH user_data AS (
    SELECT id FROM profiles WHERE username = 'lopezalegreiker@gmail.com'
),
trade_calculation AS (
    SELECT 
        1000.00 as initial_balance,
        COUNT(*) as trade_count,
        STRING_AGG(pnl_percentage::text, ', ' ORDER BY created_at) as trade_percentages
    FROM trades t, user_data u
    WHERE t.user_id = u.id
)
SELECT 
    initial_balance,
    trade_count,
    trade_percentages,
    'Expected balance calculation based on remaining trades' as note
FROM trade_calculation; 