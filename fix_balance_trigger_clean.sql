-- Fix balance calculation trigger - COMPLETE VERSION
-- This will properly recalculate balance when trades are added, updated, or deleted

-- First, drop ALL existing triggers that depend on the function
DROP TRIGGER IF EXISTS update_user_stats_trigger ON trades;
DROP TRIGGER IF EXISTS update_stats_on_trade_insert ON trades;
DROP TRIGGER IF EXISTS update_stats_on_trade_update ON trades;
DROP TRIGGER IF EXISTS update_stats_on_trade_delete ON trades;
DROP TRIGGER IF EXISTS on_trade_change ON trades;
DROP TRIGGER IF EXISTS trigger_update_user_stats ON trades;

-- Now drop the function (CASCADE to catch any we missed)
DROP FUNCTION IF EXISTS update_user_stats() CASCADE;

-- Create improved function that properly calculates balance
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    user_uuid UUID;
    account_balance_val DECIMAL(10,2);
    calculated_balance DECIMAL(10,2);
    total_trades_count INTEGER;
    wins_count INTEGER;
    losses_count INTEGER;
    breakevens_count INTEGER;
    total_pnl_percentage_val DECIMAL(10,4);
    total_pnl_pips_val DECIMAL(10,2);
    total_pnl_money_val DECIMAL(10,2);
    trade_pnl RECORD;
BEGIN
    -- Determine which user_id to use based on operation
    IF TG_OP = 'DELETE' THEN
        user_uuid := OLD.user_id;
    ELSE
        user_uuid := NEW.user_id;
    END IF;

    -- Get the user's initial account balance
    SELECT account_balance INTO account_balance_val
    FROM profiles
    WHERE id = user_uuid;

    -- If no account balance found, use default
    IF account_balance_val IS NULL THEN
        account_balance_val := 1000.00;
    END IF;

    -- Calculate all stats from trades table
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN result = 'Win' THEN 1 END),
        COUNT(CASE WHEN result = 'Loss' THEN 1 END),
        COUNT(CASE WHEN result = 'BE' THEN 1 END),
        COALESCE(SUM(pnl_percentage), 0),
        COALESCE(SUM(pnl_pips), 0),
        COALESCE(SUM(pnl_money), 0)
    INTO 
        total_trades_count,
        wins_count,
        losses_count,
        breakevens_count,
        total_pnl_percentage_val,
        total_pnl_pips_val,
        total_pnl_money_val
    FROM trades
    WHERE user_id = user_uuid;

    -- Calculate current balance based on percentage gains/losses
    calculated_balance := account_balance_val;
    
    -- Apply each trade's percentage to calculate final balance
    FOR trade_pnl IN 
        SELECT pnl_percentage 
        FROM trades 
        WHERE user_id = user_uuid 
        ORDER BY created_at ASC
    LOOP
        calculated_balance := calculated_balance * (1 + trade_pnl.pnl_percentage / 100.0);
    END LOOP;

    -- Insert or update user_stats
    INSERT INTO user_stats (
        user_id,
        total_trades,
        wins,
        losses,
        breakevens,
        total_pnl_percentage,
        total_pnl_pips,
        total_pnl_money,
        current_balance,
        updated_at
    )
    VALUES (
        user_uuid,
        total_trades_count,
        wins_count,
        losses_count,
        breakevens_count,
        total_pnl_percentage_val,
        total_pnl_pips_val,
        total_pnl_money_val,
        calculated_balance,
        NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        breakevens = EXCLUDED.breakevens,
        total_pnl_percentage = EXCLUDED.total_pnl_percentage,
        total_pnl_pips = EXCLUDED.total_pnl_pips,
        total_pnl_money = EXCLUDED.total_pnl_money,
        current_balance = EXCLUDED.current_balance,
        updated_at = EXCLUDED.updated_at;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for all operations (INSERT, UPDATE, DELETE)
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- Force recalculation for all existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM trades LOOP
        -- Trigger recalculation by updating the first trade's updated_at
        UPDATE trades 
        SET updated_at = NOW() 
        WHERE user_id = user_record.user_id 
        AND id = (SELECT id FROM trades WHERE user_id = user_record.user_id ORDER BY created_at ASC LIMIT 1);
    END LOOP;
END $$;

-- Show current status
SELECT 
    p.id,
    p.username,
    p.account_balance as initial_balance,
    us.current_balance,
    us.total_trades,
    us.total_pnl_percentage
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
ORDER BY p.created_at DESC; 