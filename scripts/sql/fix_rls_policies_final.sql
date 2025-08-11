-- Fix RLS policies for automation_execution_summary table
-- This will allow the trigger to update the summary table when executions complete

-- First, drop ALL existing policies on these tables to avoid conflicts
DO $$ 
BEGIN
    -- Drop all policies on automation_execution_summary
    DROP POLICY IF EXISTS "Users can view their own execution summaries" ON public.automation_execution_summary;
    DROP POLICY IF EXISTS "System can insert execution summaries" ON public.automation_execution_summary;
    DROP POLICY IF EXISTS "System can update execution summaries" ON public.automation_execution_summary;
    DROP POLICY IF EXISTS "Users can insert execution summaries" ON public.automation_execution_summary;
    DROP POLICY IF EXISTS "Users can update execution summaries" ON public.automation_execution_summary;
    
    -- Drop all policies on automation_executions
    DROP POLICY IF EXISTS "Users can update their execution records" ON public.automation_executions;
    DROP POLICY IF EXISTS "Users can create executions" ON public.automation_executions;
    DROP POLICY IF EXISTS "Users can view their executions" ON public.automation_executions;
    DROP POLICY IF EXISTS "Users can view own executions" ON public.automation_executions;
    DROP POLICY IF EXISTS "Users can insert own executions" ON public.automation_executions;
    DROP POLICY IF EXISTS "Users can update own executions" ON public.automation_executions;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors from dropping policies that don't exist
        NULL;
END $$;

-- Now create fresh policies with correct column names

-- ============================================
-- AUTOMATION_EXECUTION_SUMMARY POLICIES
-- ============================================

-- 1. Allow users to view their own execution summaries
CREATE POLICY "Users can view their own execution summaries" 
ON public.automation_execution_summary
FOR SELECT 
USING (
    user_id = (select auth.uid()) OR
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
    user_id = (select auth.uid()) OR
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
    user_id = (select auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.automations 
        WHERE automations.id = automation_execution_summary.automation_id 
        AND automations.created_by = (select auth.uid())
    )
);

-- ============================================
-- AUTOMATION_EXECUTIONS POLICIES
-- ============================================

-- Allow users to view their executions
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

-- Allow users to create executions
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

-- ============================================
-- FIX EXISTING STUCK EXECUTIONS
-- ============================================

-- Fix all stuck executions (change status from 'running' to 'success' for completed ones)
UPDATE public.automation_executions 
SET status = 'success' 
WHERE status = 'running' 
  AND (completed_at IS NOT NULL OR execution_time IS NOT NULL)
  AND user_id = (select auth.uid());

-- Show how many records were fixed
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE 'Fixed % execution records', fixed_count;
END $$;

-- ============================================
-- VERIFY THE POLICIES
-- ============================================

-- Show the created policies
SELECT 
    tablename,
    policyname,
    cmd as operation,
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