-- App Linking Fix - Alternative Approach
-- Use this if the comprehensive solution doesn't work due to automation table constraints
-- Generated on 2025-08-04

-- OPTION 1: Temporarily disable foreign key constraint
-- (Use this if you need to insert test data without an automation)
/*
BEGIN;

-- Temporarily drop the foreign key constraint
ALTER TABLE public.public_shares 
DROP CONSTRAINT IF EXISTS public_shares_automation_id_fkey;

-- Insert test share without automation
INSERT INTO public.public_shares (
    id,
    automation_id,
    automation_data,
    expires_at,
    access_count,
    is_active,
    metadata
) VALUES (
    'testshare_no_fk',
    '00000000-0000-0000-0000-000000000000'::uuid, -- Dummy UUID
    '{
        "id": "00000000-0000-0000-0000-000000000000",
        "title": "Test Share (No FK)",
        "description": "Testing without foreign key",
        "steps": []
    }'::jsonb,
    now() + INTERVAL '30 days',
    0,
    true,
    '{"test": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Re-add the foreign key constraint (optional)
-- Only do this after ensuring all shares have valid automation_ids
ALTER TABLE public.public_shares 
ADD CONSTRAINT public_shares_automation_id_fkey 
FOREIGN KEY (automation_id) REFERENCES public.automations(id);

COMMIT;
*/

-- OPTION 2: Create minimal automation with only required fields
-- First, check what columns are actually required:
WITH column_info AS (
    SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        CASE 
            WHEN is_nullable = 'NO' AND column_default IS NULL THEN 'REQUIRED'
            WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN 'HAS DEFAULT'
            ELSE 'OPTIONAL'
        END as status
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'automations'
    ORDER BY ordinal_position
)
SELECT * FROM column_info WHERE status = 'REQUIRED';

-- OPTION 3: Use this query to find a safe automation_id to use
-- This finds the most recently created public automation
/*
SELECT 
    id,
    title,
    created_at
FROM public.automations
WHERE is_public = true
ORDER BY created_at DESC
LIMIT 1;
*/

-- OPTION 4: Create the simplest possible automation
-- Adjust based on the required columns from the query above
/*
BEGIN;

INSERT INTO public.automations (
    id,
    title,
    description,
    is_public,
    created_at,
    updated_at
    -- Add other required columns here based on the column_info query
) VALUES (
    gen_random_uuid(),
    'Share Test Automation',
    'Minimal automation for testing shares',
    true,
    now(),
    now()
    -- Add values for other required columns
);

-- Get the ID of the automation we just created
WITH new_automation AS (
    SELECT id 
    FROM public.automations 
    WHERE title = 'Share Test Automation' 
    ORDER BY created_at DESC 
    LIMIT 1
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
FROM new_automation;

COMMIT;
*/

-- DIAGNOSTIC: Check existing shares and their automation references
SELECT 
    ps.id as share_id,
    ps.automation_id,
    a.id as actual_automation_id,
    a.title as automation_title,
    CASE 
        WHEN a.id IS NULL THEN 'INVALID - Automation does not exist!'
        ELSE 'VALID'
    END as status
FROM public.public_shares ps
LEFT JOIN public.automations a ON ps.automation_id = a.id
ORDER BY ps.created_at DESC
LIMIT 10;