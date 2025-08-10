-- Fix Authentication and Public Automations Loading
-- Generated on 2025-08-04

BEGIN;

-- Step 1: Ensure automations table has proper columns
ALTER TABLE automations 
ADD COLUMN IF NOT EXISTS author jsonb DEFAULT '{"name": "Unknown"}',
ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS downloads_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;

-- Step 2: Create automation_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.automation_likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id uuid NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(automation_id, user_id)
);

-- Step 3: Enable RLS on automation_likes
ALTER TABLE public.automation_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all likes" ON public.automation_likes;
DROP POLICY IF EXISTS "Users can like automations" ON public.automation_likes;
DROP POLICY IF EXISTS "Users can unlike their likes" ON public.automation_likes;

-- Create new policies
CREATE POLICY "Users can view all likes"
    ON public.automation_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can like automations"
    ON public.automation_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their likes"
    ON public.automation_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Step 4: Fix automations table RLS policies
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public automations are viewable by everyone" ON automations;
DROP POLICY IF EXISTS "Users can view their own automations" ON automations;
DROP POLICY IF EXISTS "Users can create their own automations" ON automations;
DROP POLICY IF EXISTS "Users can update their own automations" ON automations;
DROP POLICY IF EXISTS "Users can delete their own automations" ON automations;
DROP POLICY IF EXISTS "Anyone can view public automations" ON automations;

-- Create comprehensive policies
CREATE POLICY "Anyone can view public automations"
    ON automations FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can view their own automations"
    ON automations FOR SELECT
    USING (auth.uid() = created_by);

CREATE POLICY "Users can create automations"
    ON automations FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own automations"
    ON automations FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own automations"
    ON automations FOR DELETE
    USING (auth.uid() = created_by);

-- Step 5: Create or replace functions for engagement tracking
CREATE OR REPLACE FUNCTION public.get_automation_engagement(p_automation_id uuid)
RETURNS TABLE (
    likes_count bigint,
    downloads_count integer,
    executions_count bigint,
    user_has_liked boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM automation_likes WHERE automation_id = p_automation_id), 0)::bigint,
        COALESCE((SELECT downloads_count FROM automations WHERE id = p_automation_id), 0),
        COALESCE((SELECT COUNT(*) FROM automation_executions WHERE automation_id = p_automation_id), 0)::bigint,
        COALESCE((SELECT EXISTS(SELECT 1 FROM automation_likes WHERE automation_id = p_automation_id AND user_id = auth.uid())), false);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trending_automations(
    p_limit integer DEFAULT 10,
    p_time_window interval DEFAULT '7 days'
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    category text,
    created_by uuid,
    created_at timestamptz,
    likes_count bigint,
    downloads_count integer,
    views_count integer,
    is_public boolean,
    tags text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.description,
        a.category,
        a.created_by,
        a.created_at,
        COALESCE((SELECT COUNT(*) FROM automation_likes al WHERE al.automation_id = a.id), 0)::bigint as likes_count,
        COALESCE(a.downloads_count, 0),
        COALESCE(a.views_count, 0),
        a.is_public,
        a.tags
    FROM automations a
    WHERE a.is_public = true
        AND a.created_at >= NOW() - p_time_window
    ORDER BY 
        (COALESCE(a.downloads_count, 0) * 2 + 
         COALESCE(a.views_count, 0) + 
         COALESCE((SELECT COUNT(*) FROM automation_likes al WHERE al.automation_id = a.id), 0) * 3) DESC,
        a.created_at DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_automation_view(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE automations
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_automation_download(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE automations
    SET downloads_count = COALESCE(downloads_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

-- Step 6: Create or update users table for profiles
CREATE TABLE IF NOT EXISTS public.users (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text,
    name text,
    avatar_url text,
    role text DEFAULT 'user',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Create policies for users table
CREATE POLICY "Users can view all profiles"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Step 7: Create trigger to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger only if we can access auth.users
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END$$;

-- Step 8: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON automations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON automation_likes TO authenticated;
GRANT INSERT, UPDATE ON users TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Step 9: Create sample public automations if none exist
DO $$
DECLARE
    sample_user_id uuid;
BEGIN
    -- Check if we have any public automations
    IF NOT EXISTS (SELECT 1 FROM automations WHERE is_public = true) THEN
        -- Get or create a sample user
        SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
        
        IF sample_user_id IS NOT NULL THEN
            -- Insert sample automations
            INSERT INTO automations (title, description, category, is_public, created_by, steps, tags, author)
            VALUES 
            ('Morning Routine', 'Automate your morning with weather updates and news', 'Productivity', true, sample_user_id, 
             '[{"type": "webhook", "config": {"url": "https://api.weather.com", "method": "GET"}}]'::jsonb, 
             ARRAY['daily', 'productivity'], '{"name": "System"}'::jsonb),
            
            ('Smart Home Welcome', 'Turn on lights and adjust temperature when arriving home', 'Smart Home', true, sample_user_id,
             '[{"type": "webhook", "config": {"url": "https://api.smarthome.com/lights", "method": "POST"}}]'::jsonb,
             ARRAY['home', 'automation'], '{"name": "System"}'::jsonb),
            
            ('Social Media Post', 'Cross-post to multiple social platforms', 'Social', true, sample_user_id,
             '[{"type": "webhook", "config": {"url": "https://api.socialmedia.com/post", "method": "POST"}}]'::jsonb,
             ARRAY['social', 'marketing'], '{"name": "System"}'::jsonb);
        END IF;
    END IF;
END$$;

COMMIT;