-- Final fix for stuck executions
-- Run each step separately in Supabase SQL Editor

-- STEP 1: View the stuck executions
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
    AND user_id = '03d628cc-5f83-44df-ac8a-6d96bfd16230'
ORDER BY created_at;

-- STEP 2: Update stuck executions to failed
-- Run this after reviewing the above
UPDATE public.automation_executions
SET 
    status = 'failed',
    completed_at = created_at + INTERVAL '30 seconds',
    execution_time = 30000,
    error_message = 'Execution timeout - RLS policy issue'
WHERE status = 'running'
    AND execution_time IS NULL
    AND completed_at IS NULL
    AND user_id = '03d628cc-5f83-44df-ac8a-6d96bfd16230'
RETURNING id, status, execution_time;

-- STEP 3: Verify the fix worked
SELECT 
    status,
    COUNT(*) as count,
    ROUND(AVG(execution_time)::numeric, 0) as avg_time_ms
FROM public.automation_executions
WHERE user_id = '03d628cc-5f83-44df-ac8a-6d96bfd16230'
    AND created_at >= CURRENT_DATE
GROUP BY status
ORDER BY status;

-- STEP 4: Check overall stats for today
SELECT 
    COUNT(*) as total_executions,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as still_running,
    CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(
            COUNT(CASE WHEN status = 'success' THEN 1 END)::numeric * 100.0 / 
            COUNT(*)::numeric, 
            1
        )
    END as success_rate_percent
FROM public.automation_executions
WHERE user_id = '03d628cc-5f83-44df-ac8a-6d96bfd16230'
    AND created_at >= CURRENT_DATE;