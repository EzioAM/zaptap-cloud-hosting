-- Safe cleanup script for stuck executions
-- Run each section separately if needed

-- STEP 1: First, let's see what we have
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

-- STEP 2: Update stuck executions (run this after reviewing the above)
UPDATE public.automation_executions
SET 
    status = 'failed',
    completed_at = created_at + INTERVAL '30 seconds',
    execution_time = 30000,
    error_message = 'Execution timeout - RLS policy issue'
WHERE status = 'running'
    AND execution_time IS NULL
    AND completed_at IS NULL
    AND created_at >= CURRENT_DATE
    AND user_id = auth.uid()
RETURNING id, status, execution_time;

-- STEP 3: View summary (safe from division by zero)
SELECT 
    COUNT(*) as total_executions,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
    CASE 
        WHEN COUNT(*) = 0 THEN 'No executions'::text
        ELSE CONCAT(
            ROUND(
                COUNT(CASE WHEN status = 'success' THEN 1 END)::numeric * 100.0 / 
                NULLIF(COUNT(*)::numeric, 0), 
                2
            )::text, 
            '%'
        )
    END as success_rate
FROM public.automation_executions
WHERE created_at >= CURRENT_DATE
    AND user_id = auth.uid();

-- STEP 4: Optional - View all today's executions with details
SELECT 
    id,
    automation_id,
    status,
    execution_time,
    created_at,
    completed_at,
    error_message
FROM public.automation_executions
WHERE created_at >= CURRENT_DATE
    AND user_id = auth.uid()
ORDER BY created_at DESC;