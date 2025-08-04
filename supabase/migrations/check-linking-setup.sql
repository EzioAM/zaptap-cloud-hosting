-- Check and Setup App Linking
-- Run this in Supabase SQL Editor to diagnose and fix issues

-- Step 1: Check automations table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'automations'
ORDER BY ordinal_position;

-- Step 2: Check if there are any automations
SELECT COUNT(*) as automation_count FROM public.automations;

-- Step 3: Show sample automation (if any exist)
SELECT * FROM public.automations LIMIT 1;

-- Step 4: Check public_shares foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'public_shares'
AND kcu.column_name = 'automation_id';

-- Step 5: Create a minimal test automation (only if needed)
-- Uncomment and adjust columns based on your actual schema:
/*
INSERT INTO public.automations (
    id,
    title,
    description,
    is_public,
    created_at,
    updated_at
    -- Add other required columns based on Step 1 results
) VALUES (
    gen_random_uuid(),
    'Test Share Automation',
    'For testing share links',
    true,
    now(),
    now()
    -- Add values for other required columns
) ON CONFLICT (id) DO NOTHING;
*/

-- Step 6: Create test share (after automation exists)
-- Get an existing automation ID first:
/*
WITH test_automation AS (
    SELECT id FROM public.automations LIMIT 1
)
INSERT INTO public.public_shares (
    id,
    automation_id,
    automation_data,
    expires_at,
    access_count,
    is_active,
    metadata
) 
SELECT 
    'testshare' || substr(md5(random()::text), 1, 7),
    id,
    jsonb_build_object(
        'id', id,
        'title', 'Test Share',
        'description', 'Testing share functionality',
        'steps', '[]'::jsonb
    ),
    now() + INTERVAL '30 days',
    0,
    true,
    '{"test": true}'::jsonb
FROM test_automation
ON CONFLICT (id) DO NOTHING;
*/
EOF < /dev/null