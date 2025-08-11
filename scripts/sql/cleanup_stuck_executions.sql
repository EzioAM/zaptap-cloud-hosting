-- Clean up stuck executions from today
-- These are executions that never completed due to earlier RLS policy issues

-- First, let's see what we're about to update
SELECT 
    id,
    automation_id,
    status,
    execution_time,
    completed_at,
    created_at
FROM public.automation_executions
WHERE status = 'running'
    AND execution_time IS NULL
    AND completed_at IS NULL
    AND created_at >= CURRENT_DATE
    AND user_id = auth.uid()
ORDER BY created_at;

-- Mark these stuck executions as failed since they never completed
UPDATE public.automation_executions
SET 
    status = 'failed',
    completed_at = created_at + INTERVAL '30 seconds', -- Assume they timed out after 30 seconds
    execution_time = 30000, -- 30 seconds in milliseconds
    error_message = 'Execution timeout - RLS policy issue'
WHERE status = 'running'
    AND execution_time IS NULL
    AND completed_at IS NULL
    AND created_at >= CURRENT_DATE
    AND user_id = auth.uid();

-- Show the results
SELECT 
    COUNT(*) as total_executions,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND(COUNT(CASE WHEN status = 'success' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 
            0
    END as success_rate
FROM public.automation_executions
WHERE created_at >= CURRENT_DATE
    AND user_id = auth.uid();