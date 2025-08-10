import { supabase } from '../services/supabase/client';

export async function fixExecutionPolicies() {
  try {
    console.log('[FixPolicies] Starting to fix execution policies...');
    
    // First, let's check if the policies exist
    const { data: existingPolicies, error: checkError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'automation_execution_summary' });
    
    if (checkError) {
      console.error('[FixPolicies] Error checking policies:', checkError);
    } else {
      console.log('[FixPolicies] Existing policies:', existingPolicies);
    }
    
    // Try to create the missing policies using raw SQL
    const queries = [
      `
      CREATE POLICY IF NOT EXISTS "System can insert execution summaries" 
      ON public.automation_execution_summary
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.automations 
          WHERE automations.id = automation_execution_summary.automation_id 
          AND automations.user_id = (select auth.uid())
        )
      );
      `,
      `
      CREATE POLICY IF NOT EXISTS "System can update execution summaries" 
      ON public.automation_execution_summary
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.automations 
          WHERE automations.id = automation_execution_summary.automation_id 
          AND automations.user_id = (select auth.uid())
        )
      );
      `,
      `
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
      `
    ];
    
    for (const query of queries) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: query });
      if (error) {
        console.error('[FixPolicies] Error executing query:', error);
      } else {
        console.log('[FixPolicies] Query executed successfully');
      }
    }
    
    console.log('[FixPolicies] Policies fix attempt completed');
  } catch (error) {
    console.error('[FixPolicies] Failed to fix policies:', error);
  }
}

// Alternative: Skip the summary table update entirely in AutomationEngine
export function shouldSkipSummaryUpdate(): boolean {
  // We can use this flag to temporarily skip summary updates
  // until the RLS policies are fixed in production
  return true; // Set to true to skip summary updates
}