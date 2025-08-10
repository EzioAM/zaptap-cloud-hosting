-- Migration: Fix automation_execution_summary RLS policies
-- Date: 2024-01-09
-- Description: Add INSERT and UPDATE policies to automation_execution_summary table to fix execution status updates

-- Add INSERT policy for automation_execution_summary
-- This allows the trigger to insert summary records when executions are created
CREATE POLICY IF NOT EXISTS "System can insert execution summaries" ON public.automation_execution_summary
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_execution_summary.automation_id 
      AND automations.user_id = (select auth.uid())
    )
  );

-- Add UPDATE policy for automation_execution_summary
-- This allows the trigger to update summary records when executions complete
CREATE POLICY IF NOT EXISTS "System can update execution summaries" ON public.automation_execution_summary
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_execution_summary.automation_id 
      AND automations.user_id = (select auth.uid())
    )
  );

-- Also ensure automation_executions table has proper policies for updates
DROP POLICY IF EXISTS "Users can update their execution records" ON public.automation_executions;
CREATE POLICY "Users can update their execution records" ON public.automation_executions
  FOR UPDATE USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_executions.automation_id 
      AND automations.user_id = (select auth.uid())
    )
  );

-- Ensure users can view their own executions
DROP POLICY IF EXISTS "Users can view their executions" ON public.automation_executions;
CREATE POLICY "Users can view their executions" ON public.automation_executions
  FOR SELECT USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_executions.automation_id 
      AND (automations.user_id = (select auth.uid()) OR automations.is_public = true)
    )
  );

-- Ensure users can insert executions for their automations or public automations
DROP POLICY IF EXISTS "Users can create executions" ON public.automation_executions;
CREATE POLICY "Users can create executions" ON public.automation_executions
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_executions.automation_id 
      AND (automations.user_id = (select auth.uid()) OR automations.is_public = true)
    )
  );