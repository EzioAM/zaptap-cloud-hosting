-- Verify Database Fixes
-- Run this after applying fix_database_issues.sql

-- 1. Check if profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
) as profiles_table_exists;

-- 2. Check if categories table has color column
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'categories' 
  AND column_name = 'color'
) as categories_color_exists;

-- 3. Check real-time publications
SELECT 
  schemaname,
  tablename,
  'Enabled for real-time' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
ORDER BY tablename;

-- 4. Show table structures
SELECT 
  table_name,
  string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'categories', 'automations', 'executions', 'deployments')
GROUP BY table_name
ORDER BY table_name;

-- 5. Check RLS policies on profiles
SELECT 
  policyname,
  cmd,
  qual IS NOT NULL as has_using_clause,
  with_check IS NOT NULL as has_with_check_clause
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;