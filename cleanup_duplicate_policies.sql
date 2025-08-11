-- Optional: Clean up duplicate policies on automation_executions table

-- Drop the duplicate policies (keeping the more descriptive names)
DROP POLICY IF EXISTS "Users can create their own executions" ON public.automation_executions;
DROP POLICY IF EXISTS "Users can update their own executions" ON public.automation_executions;
DROP POLICY IF EXISTS "Users can view their own executions" ON public.automation_executions;

-- Verify remaining policies
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN cmd = 'SELECT' THEN 'View'
        WHEN cmd = 'INSERT' THEN 'Create'
        WHEN cmd = 'UPDATE' THEN 'Update'
        WHEN cmd = 'DELETE' THEN 'Delete'
        ELSE cmd
    END as action
FROM pg_policies 
WHERE tablename IN ('automation_execution_summary', 'automation_executions')
  AND schemaname = 'public'
ORDER BY tablename, policyname;