-- Fix Critical Database/API Issues
-- Generated on 2025-08-04
-- Fixes: RLS policies blocking legitimate operations, review system, automation CRUD, public automations

BEGIN;

-- ============================================
-- Part 1: Fix Automation CRUD Operations
-- ============================================

-- Drop overly restrictive policies on automations table
DROP POLICY IF EXISTS "Users can only view their own automations" ON public.automations;
DROP POLICY IF EXISTS "Users can only view public automations" ON public.automations;

-- Create proper automation policies that allow public access and user ownership
CREATE POLICY "Users can view public automations and their own"
    ON public.automations FOR SELECT
    USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own automations"
    ON public.automations FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own automations"
    ON public.automations FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own automations"
    ON public.automations FOR DELETE
    USING (created_by = auth.uid());

-- ============================================
-- Part 2: Fix Users Table Access
-- ============================================

-- Drop overly restrictive user policies
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.users;

-- Create proper user policies
CREATE POLICY "Users can view all user profiles for public info"
    ON public.users FOR SELECT
    USING (true); -- Allow reading user names, avatars for reviews, etc.

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================
-- Part 3: Fix Review System Tables
-- ============================================

-- Ensure automation_reviews table exists and has proper structure
CREATE TABLE IF NOT EXISTS public.automation_reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    helpful_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(automation_id, user_id)
);

-- Enable RLS on automation_reviews
ALTER TABLE public.automation_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.automation_reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.automation_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.automation_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.automation_reviews;

-- Create proper review policies
CREATE POLICY "Anyone can view automation reviews"
    ON public.automation_reviews FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create reviews"
    ON public.automation_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
    ON public.automation_reviews FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
    ON public.automation_reviews FOR DELETE
    USING (auth.uid() = user_id);

-- Create reviews table as alias for automation_reviews (for compatibility)
CREATE OR REPLACE VIEW public.reviews AS
SELECT 
    id,
    automation_id,
    user_id,
    rating,
    comment,
    helpful_count,
    created_at,
    updated_at,
    comment as title -- Add title field for compatibility
FROM public.automation_reviews;

-- Grant access to the view
GRANT SELECT ON public.reviews TO authenticated, anon;

-- ============================================
-- Part 4: Fix Automation Likes System
-- ============================================

-- Create automation_likes table if not exists
CREATE TABLE IF NOT EXISTS public.automation_likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(automation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.automation_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for likes
DROP POLICY IF EXISTS "Anyone can view likes" ON public.automation_likes;
DROP POLICY IF EXISTS "Users can manage their own likes" ON public.automation_likes;

CREATE POLICY "Anyone can view automation likes"
    ON public.automation_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their own likes"
    ON public.automation_likes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Part 5: Fix Execution Tables
-- ============================================

-- Create automation_executions table if not exists
CREATE TABLE IF NOT EXISTS public.automation_executions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending',
    error_message text,
    execution_time_ms integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- Fix execution policies to be less restrictive
DROP POLICY IF EXISTS "Users can view their own executions" ON public.automation_executions;
DROP POLICY IF EXISTS "Users can create their own executions" ON public.automation_executions;
DROP POLICY IF EXISTS "Users can update their own executions" ON public.automation_executions;

CREATE POLICY "Users can view their own executions"
    ON public.automation_executions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create executions"
    ON public.automation_executions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own executions"
    ON public.automation_executions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Part 6: Fix Public Shares System
-- ============================================

-- Create public_shares table if not exists
CREATE TABLE IF NOT EXISTS public.public_shares (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
    share_code text UNIQUE NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE CASCADE,
    is_active boolean DEFAULT true,
    access_count integer DEFAULT 0,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for shares
DROP POLICY IF EXISTS "Anyone can view shares" ON public.public_shares;
DROP POLICY IF EXISTS "Authenticated users can create shares" ON public.public_shares;
DROP POLICY IF EXISTS "Authenticated users can update shares" ON public.public_shares;
DROP POLICY IF EXISTS "Authenticated users can delete shares" ON public.public_shares;

CREATE POLICY "Anyone can view active public shares"
    ON public.public_shares FOR SELECT
    USING (is_active = true);

CREATE POLICY "Users can manage their own shares"
    ON public.public_shares FOR ALL
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- ============================================
-- Part 7: Create Missing RPC Functions
-- ============================================

-- Function to get user automation stats (fixed version)
CREATE OR REPLACE FUNCTION public.get_user_automation_stats(p_user_id uuid)
RETURNS TABLE(
    total_automations bigint,
    total_runs bigint,
    successful_runs bigint,
    failed_runs bigint,
    total_time_saved integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT a.id)::bigint as total_automations,
        COALESCE(COUNT(ae.id), 0)::bigint as total_runs,
        COALESCE(COUNT(ae.id) FILTER (WHERE ae.status = 'completed'), 0)::bigint as successful_runs,
        COALESCE(COUNT(ae.id) FILTER (WHERE ae.status = 'failed'), 0)::bigint as failed_runs,
        COALESCE(SUM(ae.execution_time_ms)::integer / 1000, 0) as total_time_saved
    FROM public.automations a
    LEFT JOIN public.automation_executions ae ON ae.automation_id = a.id
    WHERE a.created_by = p_user_id;
END;
$$;

-- Function to get automation engagement
CREATE OR REPLACE FUNCTION public.get_automation_engagement(p_automation_id uuid)
RETURNS TABLE(
    likes_count bigint,
    downloads_count integer,
    executions_count bigint,
    user_has_liked boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM public.automation_likes WHERE automation_id = p_automation_id), 0)::bigint,
        COALESCE((SELECT downloads_count FROM public.automations WHERE id = p_automation_id), 0),
        COALESCE((SELECT COUNT(*) FROM public.automation_executions WHERE automation_id = p_automation_id), 0)::bigint,
        COALESCE((SELECT EXISTS(SELECT 1 FROM public.automation_likes WHERE automation_id = p_automation_id AND user_id = auth.uid())), false);
END;
$$;

-- Function to track automation downloads
CREATE OR REPLACE FUNCTION public.track_automation_download(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    UPDATE public.automations
    SET downloads_count = COALESCE(downloads_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

-- Function to track automation views
CREATE OR REPLACE FUNCTION public.track_automation_view(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    UPDATE public.automations
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

-- ============================================
-- Part 8: Add Missing Columns to Automations
-- ============================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add likes_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'likes_count') THEN
        ALTER TABLE public.automations ADD COLUMN likes_count integer DEFAULT 0;
    END IF;
    
    -- Add downloads_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'downloads_count') THEN
        ALTER TABLE public.automations ADD COLUMN downloads_count integer DEFAULT 0;
    END IF;
    
    -- Add views_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'views_count') THEN
        ALTER TABLE public.automations ADD COLUMN views_count integer DEFAULT 0;
    END IF;
    
    -- Add execution_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'execution_count') THEN
        ALTER TABLE public.automations ADD COLUMN execution_count integer DEFAULT 0;
    END IF;
    
    -- Add average_rating column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'average_rating') THEN
        ALTER TABLE public.automations ADD COLUMN average_rating numeric(3,2);
    END IF;
    
    -- Add rating_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'rating_count') THEN
        ALTER TABLE public.automations ADD COLUMN rating_count integer DEFAULT 0;
    END IF;
    
    -- Add last_executed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'last_executed_at') THEN
        ALTER TABLE public.automations ADD COLUMN last_executed_at timestamptz;
    END IF;
END $$;

-- ============================================
-- Part 9: Create Triggers for Count Updates
-- ============================================

-- Update automation likes count trigger
CREATE OR REPLACE FUNCTION public.update_automation_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.automations
        SET likes_count = COALESCE(likes_count, 0) + 1
        WHERE id = NEW.automation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.automations
        SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
        WHERE id = OLD.automation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_automation_likes_count ON public.automation_likes;

-- Create trigger
CREATE TRIGGER trigger_update_automation_likes_count
    AFTER INSERT OR DELETE ON public.automation_likes
    FOR EACH ROW EXECUTE FUNCTION public.update_automation_likes_count();

-- ============================================
-- Part 10: Grant Proper Permissions
-- ============================================

-- Grant access to all necessary tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON 
    public.automations,
    public.automation_reviews,
    public.automation_likes,
    public.automation_executions,
    public.public_shares,
    public.users
TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

COMMIT;

-- ============================================
-- Verification Queries (run these manually to test)
-- ============================================

-- Test public automation access:
-- SELECT id, title, is_public FROM public.automations WHERE is_public = true LIMIT 5;

-- Test user automation creation:
-- INSERT INTO public.automations (title, description, steps, created_by, is_public) 
-- VALUES ('Test Auto', 'Test description', '[]'::jsonb, auth.uid(), false);

-- Test review system:
-- SELECT * FROM public.automation_reviews LIMIT 5;
-- SELECT * FROM public.reviews LIMIT 5;

-- Test RLS status:
-- SELECT * FROM verify_rls_enabled();