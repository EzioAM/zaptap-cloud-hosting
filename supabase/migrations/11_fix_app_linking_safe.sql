-- App Linking Fix Migration (Safe Mode)
-- Generated on 2025-08-04T02:37:14.061Z
-- Run this in Supabase SQL Editor

BEGIN;

-- Step 1: Setting up RLS policies

-- Enable RLS on tables
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public shares are viewable by anyone" ON public.public_shares;
DROP POLICY IF EXISTS "Users can create their own public shares" ON public.public_shares;
DROP POLICY IF EXISTS "Users can update their own public shares" ON public.public_shares;
DROP POLICY IF EXISTS "Users can delete their own public shares" ON public.public_shares;
DROP POLICY IF EXISTS "Anyone can increment access count" ON public.public_shares;
DROP POLICY IF EXISTS "Service role can manage all shares" ON public.public_shares;

-- Create RLS policies for public_shares
CREATE POLICY "Public shares are viewable by anyone"
    ON public.public_shares FOR SELECT
    USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can create their own public shares"
    ON public.public_shares FOR INSERT
    WITH CHECK (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can update their own public shares"
    ON public.public_shares FOR UPDATE
    USING (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can delete their own public shares"
    ON public.public_shares FOR DELETE
    USING (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'service_role');

-- Special policy to allow anonymous users to increment access count
CREATE POLICY "Anyone can increment access count"
    ON public.public_shares FOR UPDATE
    USING (is_active = true AND expires_at > now())
    WITH CHECK (
        -- Only allow updating access_count and last_accessed_at
        (access_count = (OLD.access_count + 1)) AND
        (last_accessed_at = now()) AND
        -- Ensure other fields remain unchanged
        (id = OLD.id) AND
        (automation_id = OLD.automation_id) AND
        (automation_data = OLD.automation_data) AND
        (created_by IS NOT DISTINCT FROM OLD.created_by) AND
        (created_at = OLD.created_at) AND
        (expires_at = OLD.expires_at) AND
        (is_active = OLD.is_active) AND
        (metadata = OLD.metadata)
    );

-- Service role bypass for testing
CREATE POLICY "Service role can manage all shares"
    ON public.public_shares FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Drop existing policies for sharing_logs if they exist
DROP POLICY IF EXISTS "Users can view their own sharing logs" ON public.sharing_logs;
DROP POLICY IF EXISTS "Users can create sharing logs" ON public.sharing_logs;

-- Create RLS policies for sharing_logs
CREATE POLICY "Users can view their own sharing logs"
    ON public.sharing_logs FOR SELECT
    USING (auth.uid() = shared_by OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can create sharing logs"
    ON public.sharing_logs FOR INSERT
    WITH CHECK (auth.uid() = shared_by OR auth.jwt() ->> 'role' = 'service_role');


-- Step 2: Creating helper functions

-- Function to get public share data (works for anonymous users)
CREATE OR REPLACE FUNCTION public.get_public_share(share_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    share_data jsonb;
BEGIN
    -- Get share data and increment access count
    UPDATE public.public_shares
    SET 
        access_count = access_count + 1,
        last_accessed_at = now()
    WHERE 
        id = share_id AND
        is_active = true AND
        expires_at > now()
    RETURNING jsonb_build_object(
        'id', id,
        'automation_id', automation_id,
        'automation_data', automation_data,
        'created_at', created_at,
        'expires_at', expires_at,
        'access_count', access_count
    ) INTO share_data;
    
    RETURN share_data;
END;
$$;

-- Function to clean up expired shares
CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.public_shares
    WHERE expires_at < now() - INTERVAL '7 days'
    RETURNING COUNT(*) INTO deleted_count;
    
    RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_share(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_shares() TO authenticated;


-- Test Data: Create a test share
INSERT INTO public.public_shares (
    id,
    automation_id,
    automation_data,
    expires_at,
    access_count,
    is_active,
    metadata
) VALUES (
    'testshare' || substr(md5(random()::text), 1, 7),
    '11111111-1111-1111-1111-111111111111',
    '{
        "id": "11111111-1111-1111-1111-111111111111",
        "title": "Test Welcome Automation",
        "description": "A test automation for verifying share links work",
        "steps": [{
            "id": "step1",
            "type": "notification",
            "title": "Welcome Message",
            "enabled": true,
            "config": {
                "title": "Welcome!",
                "message": "Share links are working correctly!"
            }
        }],
        "triggers": [],
        "is_public": true,
        "category": "test",
        "tags": ["test", "share"]
    }'::jsonb,
    now() + INTERVAL '30 days',
    0,
    true,
    '{"test": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

COMMIT;

-- After running this migration:
-- 1. Check that tables were created: SELECT * FROM public_shares LIMIT 1;
-- 2. Test share links in your app
-- 3. Run the RPC functions migration if needed
