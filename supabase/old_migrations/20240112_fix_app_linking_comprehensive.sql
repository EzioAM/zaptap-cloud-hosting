-- App Linking Fix Migration (Comprehensive Solution)
-- Handles foreign key constraint: public_shares_automation_id_fkey
-- Generated on 2025-08-04

BEGIN;

-- Step 1: Drop and recreate functions with proper signatures
DROP FUNCTION IF EXISTS public.get_public_share(text);
DROP FUNCTION IF EXISTS public.cleanup_expired_shares();

-- Step 2: Set up RLS policies (incorporating ChatGPT's improvements)
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public shares are viewable by anyone" ON public.public_shares;
DROP POLICY IF EXISTS "Users can create their own public shares" ON public.public_shares;
DROP POLICY IF EXISTS "Users can update their own public shares" ON public.public_shares;
DROP POLICY IF EXISTS "Users can delete their own public shares" ON public.public_shares;
DROP POLICY IF EXISTS "Anyone can increment access count" ON public.public_shares;
DROP POLICY IF EXISTS "Service role can manage all shares" ON public.public_shares;

DROP POLICY IF EXISTS "Users can view their own sharing logs" ON public.sharing_logs;
DROP POLICY IF EXISTS "Users can create sharing logs" ON public.sharing_logs;

-- Create improved RLS policies
CREATE POLICY "Public shares are viewable by anyone"
    ON public.public_shares FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

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

-- Allow anonymous increment of access count
CREATE POLICY "Anyone can increment access count"
    ON public.public_shares FOR UPDATE
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()))
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

-- Service role bypass
CREATE POLICY "Service role can manage all shares"
    ON public.public_shares FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Sharing logs policies
CREATE POLICY "Users can view their own sharing logs"
    ON public.sharing_logs FOR SELECT
    USING (auth.uid() = shared_by OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can create sharing logs"
    ON public.sharing_logs FOR INSERT
    WITH CHECK (auth.uid() = shared_by OR auth.jwt() ->> 'role' = 'service_role');

-- Step 3: Create helper functions
CREATE OR REPLACE FUNCTION public.get_public_share(share_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    share_data jsonb;
BEGIN
    UPDATE public.public_shares
    SET 
        access_count = COALESCE(access_count, 0) + 1,
        last_accessed_at = now()
    WHERE 
        id = share_id AND
        is_active = true AND
        (expires_at IS NULL OR expires_at > now())
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
    WHERE expires_at IS NOT NULL AND expires_at < now() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_public_share(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_shares() TO authenticated;

-- Step 4: Smart test data creation that respects foreign key constraint
DO $$
DECLARE
    test_automation_id uuid;
    test_share_id text;
    required_columns text[];
    column_list text;
    value_list text;
BEGIN
    -- Check if automations table exists and has data
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'automations'
    ) THEN
        -- Try to find an existing automation
        SELECT id INTO test_automation_id
        FROM public.automations
        WHERE is_public = true  -- Prefer public automations for testing
        LIMIT 1;
        
        -- If no automations exist, we need to create one
        IF test_automation_id IS NULL THEN
            -- Get required columns (non-nullable without defaults)
            SELECT array_agg(column_name)
            INTO required_columns
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'automations'
            AND is_nullable = 'NO'
            AND column_default IS NULL
            AND column_name NOT IN ('id', 'created_at', 'updated_at');
            
            -- Generate a new ID
            test_automation_id := gen_random_uuid();
            
            -- Build column and value lists dynamically
            column_list := 'id, title, description, is_public, created_at, updated_at';
            value_list := format('%L, %L, %L, %L, %L, %L',
                test_automation_id,
                'Test Share Automation',
                'Automation for testing share functionality',
                true,
                now(),
                now()
            );
            
            -- Add any other required columns with default values
            IF required_columns IS NOT NULL THEN
                FOREACH column_list IN ARRAY required_columns
                LOOP
                    -- Add sensible defaults for common column names
                    CASE 
                        WHEN column_list LIKE '%user%' OR column_list = 'created_by' THEN
                            -- Skip user-related columns for test data
                            CONTINUE;
                        WHEN column_list LIKE '%count%' THEN
                            column_list := column_list || ', ' || column_list;
                            value_list := value_list || ', 0';
                        WHEN column_list = 'category' THEN
                            column_list := column_list || ', category';
                            value_list := value_list || ', ''test''';
                        ELSE
                            -- For unknown columns, try empty string or skip
                            RAISE NOTICE 'Unknown required column: %, skipping', column_list;
                    END CASE;
                END LOOP;
            END IF;
            
            -- Try to insert the test automation
            BEGIN
                EXECUTE format(
                    'INSERT INTO public.automations (%s) VALUES (%s) ON CONFLICT (id) DO NOTHING',
                    column_list,
                    value_list
                );
                
                RAISE NOTICE 'Created test automation with ID: %', test_automation_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not create test automation: %', SQLERRM;
                RAISE NOTICE 'Please create an automation manually first';
                RETURN; -- Exit without creating share
            END;
        ELSE
            RAISE NOTICE 'Using existing automation ID: %', test_automation_id;
        END IF;
        
        -- Now create the test share with valid automation_id
        test_share_id := 'testshare' || substr(md5(random()::text), 1, 7);
        
        INSERT INTO public.public_shares (
            id,
            automation_id,
            automation_data,
            expires_at,
            access_count,
            is_active,
            metadata
        ) VALUES (
            test_share_id,
            test_automation_id,
            jsonb_build_object(
                'id', test_automation_id,
                'title', 'Test Welcome Automation',
                'description', 'Share link test',
                'steps', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'step1',
                        'type', 'notification',
                        'title', 'Welcome',
                        'enabled', true,
                        'config', jsonb_build_object(
                            'title', 'Welcome!',
                            'message', 'Share links are working!'
                        )
                    )
                ),
                'triggers', '[]'::jsonb,
                'is_public', true,
                'category', 'test',
                'tags', jsonb_build_array('test', 'share')
            ),
            now() + INTERVAL '30 days',
            0,
            true,
            '{"test": true}'::jsonb
        ) ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Test share created with ID: %', test_share_id;
        RAISE NOTICE 'Test share URL: https://www.zaptap.cloud/share/%', test_share_id;
        
    ELSE
        RAISE WARNING 'Automations table does not exist. Cannot create test data.';
        RAISE WARNING 'Please ensure your database schema is properly set up.';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating test data: %', SQLERRM;
    RAISE NOTICE 'You may need to create test data manually';
END $$;

COMMIT;

-- Verification queries:
-- SELECT * FROM public_shares WHERE id LIKE 'testshare%';
-- SELECT get_public_share('testshareXXXXXXX'); -- Replace with actual ID
-- SELECT * FROM pg_policies WHERE tablename IN ('public_shares', 'sharing_logs');