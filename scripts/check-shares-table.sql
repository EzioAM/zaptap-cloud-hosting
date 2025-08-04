-- Check the structure of the shares table to understand what columns it has

-- Show all columns in the shares table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shares'
ORDER BY ordinal_position;

-- Show any existing policies on shares table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'shares';

-- Check if RLS is enabled
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'shares'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');