
-- App Linking Fix Migration
-- Run this in Supabase SQL Editor if the automatic fix didn't work

BEGIN;

-- 1. Create public_shares table
CREATE TABLE IF NOT EXISTS public.public_shares (
    id text PRIMARY KEY,
    automation_id uuid NOT NULL,
    automation_data jsonb NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    access_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_accessed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}' NOT NULL
);

-- 2. Create sharing_logs table
CREATE TABLE IF NOT EXISTS public.sharing_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id uuid NOT NULL,
    share_id text REFERENCES public.public_shares(id) ON DELETE CASCADE,
    method text NOT NULL CHECK (method IN ('link', 'email', 'sms', 'qr', 'nfc')),
    recipients text[] DEFAULT '{}',
    shared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    shared_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}' NOT NULL
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_public_shares_automation_id ON public.public_shares(automation_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public.public_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_shares_is_active ON public.public_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_public_shares_created_by ON public.public_shares(created_by);

CREATE INDEX IF NOT EXISTS idx_sharing_logs_automation_id ON public.sharing_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_share_id ON public.sharing_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_by ON public.sharing_logs(shared_by);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_at ON public.sharing_logs(shared_at DESC);

-- 4. Enable RLS
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Public shares are viewable by anyone"
    ON public.public_shares FOR SELECT
    USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can create their own public shares"
    ON public.public_shares FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own public shares"
    ON public.public_shares FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own public shares"
    ON public.public_shares FOR DELETE
    USING (auth.uid() = created_by);

CREATE POLICY "Anyone can increment access count"
    ON public.public_shares FOR UPDATE
    USING (is_active = true AND expires_at > now())
    WITH CHECK (
        (access_count = (OLD.access_count + 1)) AND
        (last_accessed_at = now()) AND
        (id = OLD.id) AND
        (automation_id = OLD.automation_id) AND
        (automation_data = OLD.automation_data) AND
        (created_by IS NOT DISTINCT FROM OLD.created_by) AND
        (created_at = OLD.created_at) AND
        (expires_at = OLD.expires_at) AND
        (is_active = OLD.is_active) AND
        (metadata = OLD.metadata)
    );

CREATE POLICY "Users can view their own sharing logs"
    ON public.sharing_logs FOR SELECT
    USING (auth.uid() = shared_by);

CREATE POLICY "Users can create sharing logs"
    ON public.sharing_logs FOR INSERT
    WITH CHECK (auth.uid() = shared_by);

-- 6. Create helper functions
CREATE OR REPLACE FUNCTION public.get_public_share(share_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    share_data jsonb;
BEGIN
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

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_public_share(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_shares() TO authenticated;

-- 8. Create test share
INSERT INTO public.public_shares (
    id,
    automation_id,
    automation_data,
    expires_at,
    access_count,
    is_active,
    metadata
) VALUES (
    'testshare123',
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
);

COMMIT;

-- Test the share link: https://www.zaptap.cloud/share/testshare123
