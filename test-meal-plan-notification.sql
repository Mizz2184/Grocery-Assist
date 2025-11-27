-- Test script for meal plan notification system
-- Run each section separately and check the results

-- ============================================
-- SECTION 1: Verify Tables Exist
-- ============================================
SELECT 'Checking if required tables exist...' as status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
    THEN '✅ notifications table exists'
    ELSE '❌ notifications table MISSING - Run create-notifications-table.sql'
  END as notifications_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') 
    THEN '✅ notification_preferences table exists'
    ELSE '❌ notification_preferences table MISSING - Run update-notification-preferences.sql'
  END as preferences_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
    THEN '✅ profiles table exists'
    ELSE '❌ profiles table MISSING - Run create-profiles-table.sql'
  END as profiles_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meal_plans') 
    THEN '✅ meal_plans table exists'
    ELSE '❌ meal_plans table MISSING'
  END as meal_plans_table;

-- ============================================
-- SECTION 2: Verify Function Exists
-- ============================================
SELECT 'Checking if get_user_id_by_email function exists...' as status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_id_by_email') 
    THEN '✅ get_user_id_by_email function exists'
    ELSE '❌ get_user_id_by_email function MISSING - Run create-get-user-id-function.sql'
  END as function_status;

-- ============================================
-- SECTION 3: Check Your Users
-- ============================================
SELECT 'Listing all users...' as status;

SELECT 
  au.id,
  au.email,
  p.full_name,
  CASE WHEN p.id IS NOT NULL THEN '✅ Has profile' ELSE '❌ No profile' END as profile_status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- ============================================
-- SECTION 4: Test get_user_id_by_email Function
-- ============================================
-- REPLACE 'collaborator@example.com' with the actual collaborator email
SELECT 'Testing get_user_id_by_email function...' as status;

SELECT 
  'collaborator@example.com' as email_tested,
  get_user_id_by_email('collaborator@example.com') as user_id_result,
  CASE 
    WHEN get_user_id_by_email('collaborator@example.com') IS NOT NULL 
    THEN '✅ Function works - User found'
    ELSE '❌ Function returned NULL - User not found or function broken'
  END as test_result;

-- ============================================
-- SECTION 5: Check Meal Plans and Collaborators
-- ============================================
SELECT 'Checking meal plans...' as status;

SELECT 
  mp.id,
  mp.name,
  mp.user_id,
  mp.week_start_date,
  mp.collaborators,
  au.email as owner_email,
  CASE 
    WHEN mp.collaborators IS NULL OR array_length(mp.collaborators, 1) IS NULL 
    THEN '⚠️ No collaborators'
    ELSE '✅ Has ' || array_length(mp.collaborators, 1) || ' collaborator(s)'
  END as collaborator_status
FROM meal_plans mp
LEFT JOIN auth.users au ON mp.user_id = au.id
ORDER BY mp.created_at DESC
LIMIT 5;

-- ============================================
-- SECTION 6: Check Notifications
-- ============================================
SELECT 'Checking notifications...' as status;

SELECT 
  n.id,
  n.user_id,
  au.email as recipient_email,
  n.type,
  n.title,
  n.message,
  n.read,
  n.created_at
FROM notifications n
LEFT JOIN auth.users au ON n.user_id = au.id
WHERE n.type = 'meal_plan_shared'
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================
-- SECTION 7: Check Notification Preferences
-- ============================================
SELECT 'Checking notification preferences...' as status;

SELECT 
  np.user_id,
  au.email,
  np.meal_plan_shared,
  np.meal_added,
  np.meal_plan_updated,
  CASE 
    WHEN np.meal_plan_shared = true 
    THEN '✅ meal_plan_shared enabled'
    ELSE '❌ meal_plan_shared DISABLED'
  END as preference_status
FROM notification_preferences np
LEFT JOIN auth.users au ON np.user_id = au.id
ORDER BY np.created_at DESC;

-- ============================================
-- SECTION 8: Check RLS Policies
-- ============================================
SELECT 'Checking RLS policies on notifications table...' as status;

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- ============================================
-- SECTION 9: Manual Test - Create a Test Notification
-- ============================================
-- REPLACE 'your-user-id-here' with actual user ID from Section 3
SELECT 'Creating test notification...' as status;

-- Uncomment and run this to manually create a test notification:
/*
INSERT INTO notifications (user_id, type, title, message, data, read)
VALUES (
  'your-user-id-here',
  'meal_plan_shared',
  'Test Notification',
  'This is a test notification to verify the system works',
  '{"test": true}'::jsonb,
  false
)
RETURNING *;
*/

-- ============================================
-- SECTION 10: Check if Realtime is Enabled
-- ============================================
SELECT 'Checking if Realtime is enabled on notifications...' as status;

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN COUNT(*) > 0 
    THEN '✅ Realtime is enabled'
    ELSE '⚠️ Realtime may not be enabled - Check Supabase Dashboard > Database > Replication'
  END as realtime_status
FROM pg_publication_tables
WHERE tablename = 'notifications'
GROUP BY schemaname, tablename;

-- ============================================
-- SUMMARY
-- ============================================
SELECT '
============================================
TROUBLESHOOTING CHECKLIST:
============================================

1. All tables exist? (Section 1)
2. get_user_id_by_email function exists? (Section 2)
3. Both users have profiles? (Section 3)
4. Function returns user ID correctly? (Section 4)
5. Meal plan has collaborators array? (Section 5)
6. Any notifications created? (Section 6)
7. Preferences allow meal_plan_shared? (Section 7)
8. RLS policies exist? (Section 8)
9. Can manually create notification? (Section 9)
10. Realtime enabled? (Section 10)

If all checks pass but still no notification:
- Check browser console for errors
- Verify both users are logged in
- Clear browser cache and reload
- Check Supabase logs for errors
' as checklist;
