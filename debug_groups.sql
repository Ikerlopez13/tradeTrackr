-- Debug script to check if groups are being created and identify permission issues

-- 1. Check if groups exist in the database
SELECT 
    'Groups in database:' as check_type,
    id,
    name,
    description,
    created_by,
    invite_code,
    is_public,
    created_at
FROM friend_groups
ORDER BY created_at DESC;

-- 2. Check group memberships
SELECT 
    'Group memberships:' as check_type,
    gm.id,
    gm.group_id,
    gm.user_id,
    gm.role,
    gm.joined_at,
    fg.name as group_name
FROM group_memberships gm
JOIN friend_groups fg ON gm.group_id = fg.id
ORDER BY gm.joined_at DESC;

-- 3. Check current user ID (replace with your actual user ID if you know it)
SELECT 
    'Current user check:' as check_type,
    auth.uid() as current_user_id;

-- 4. Check what groups the current user should see (with RLS)
SELECT 
    'Groups visible to current user:' as check_type,
    fg.id,
    fg.name,
    fg.description,
    fg.created_by,
    fg.is_public,
    gm.role as user_role
FROM friend_groups fg
LEFT JOIN group_memberships gm ON fg.id = gm.group_id AND gm.user_id = auth.uid()
WHERE fg.is_public = true OR gm.user_id = auth.uid() OR fg.created_by = auth.uid();

-- 5. Check RLS policies status
SELECT 
    'RLS policies check:' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('friend_groups', 'group_memberships');

-- 6. Test creating a simple group (uncomment to test)
/*
SELECT create_friend_group(
    'Debug Test Group',
    'A test group for debugging',
    true,
    10
) as test_group_result;
*/

-- 7. Check if there are any groups at all (bypassing RLS for admin check)
-- Note: This might fail if you don't have admin privileges
/*
SET row_security = off;
SELECT 'All groups (admin view):' as check_type, * FROM friend_groups;
SET row_security = on;
*/ 