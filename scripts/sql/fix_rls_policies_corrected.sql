-- Fix RLS policies for automation_execution_summary table
-- This will allow the trigger to update the summary table when executions complete

-- First, check if the policies exist and drop them if they do
DROP POLICY IF EXISTS "Users can view their own execution summaries" ON public.automation_execution_summary;
DROP POLICY IF EXISTS "System can insert execution summaries" ON public.automation_execution_summary;
DROP POLICY IF EXISTS "System can update execution summaries" ON public.automation_execution_summary;
DROP POLICY IF EXISTS "Users can insert execution summaries" ON public.automation_execution_summary;
DROP POLICY IF EXISTS "Users can update execution summaries" ON public.automation_execution_summary;

-- Create comprehensive policies for the automation_execution_summary table

-- 1. Allow users to view their own execution summaries
CREATE POLICY "Users can view their own execution summaries" 
ON public.automation_execution_summary
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.automations 
        WHERE automations.id = automation_execution_summary.automation_id 
        AND automations.created_by = (select auth.uid())
    )
);

-- 2. Allow inserts for user's own automations (for the trigger)
CREATE POLICY "Users can insert execution summaries" 
ON public.automation_execution_summary
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.automations 
        WHERE automations.id = automation_execution_summary.automation_id 
        AND automations.created_by = (select auth.uid())
    )
);

-- 3. Allow updates for user's own automations (for the trigger)
CREATE POLICY "Users can update execution summaries" 
ON public.automation_execution_summary
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.automations 
        WHERE automations.id = automation_execution_summary.automation_id 
        AND automations.created_by = (select auth.uid())
    )
);

-- Also fix the automation_executions policies to ensure updates work properly
DROP POLICY IF EXISTS "Users can update their execution records" ON public.automation_executions;

-- Allow users to update their own execution records
CREATE POLICY "Users can update their execution records" 
ON public.automation_executions
FOR UPDATE 
USING (
    user_id = (select auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.automations 
        WHERE automations.id = automation_executions.automation_id 
        AND automations.created_by = (select auth.uid())
    )
);

-- Ensure users can insert executions
DROP POLICY IF EXISTS "Users can create executions" ON public.automation_executions;

CREATE POLICY "Users can create executions" 
ON public.automation_executions
FOR INSERT 
WITH CHECK (
    user_id = (select auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.automations 
        WHERE automations.id = automation_executions.automation_id 
        AND (automations.created_by = (select auth.uid()) OR automations.is_public = true)
    )
);

-- Ensure users can view their executions
DROP POLICY IF EXISTS "Users can view their executions" ON public.automation_executions;

CREATE POLICY "Users can view their executions" 
ON public.automation_executions
FOR SELECT 
USING (
    user_id = (select auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.automations 
        WHERE automations.id = automation_executions.automation_id 
        AND (automations.created_by = (select auth.uid()) OR automations.is_public = true)
    )
);

-- Optional: If you want to fix all stuck executions (change status from 'running' to 'success' for completed ones)
-- This will fix executions that have execution_time or completed_at but are stuck in 'running' status

UPDATE public.automation_executions 
SET status = 'success' 
WHERE status = 'running' 
  AND (completed_at IS NOT NULL OR execution_time IS NOT NULL)
  AND user_id = (select auth.uid());

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('automation_execution_summary', 'automation_executions')
ORDER BY tablename, policyname;