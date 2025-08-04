-- Enable Row Level Security (RLS) on all public tables
-- This script enables RLS and creates appropriate policies for data access control

-- 1. user_collections table
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own collections" ON public.user_collections;
DROP POLICY IF EXISTS "Users can create their own collections" ON public.user_collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON public.user_collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON public.user_collections;

-- Create policies for user_collections
CREATE POLICY "Users can view their own collections"
    ON public.user_collections FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own collections"
    ON public.user_collections FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own collections"
    ON public.user_collections FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own collections"
    ON public.user_collections FOR DELETE
    USING (user_id = auth.uid());

-- 2. automation_reviews table
ALTER TABLE public.automation_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.automation_reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.automation_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.automation_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.automation_reviews;

-- Create policies for automation_reviews
CREATE POLICY "Anyone can view reviews"
    ON public.automation_reviews FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create reviews"
    ON public.automation_reviews FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own reviews"
    ON public.automation_reviews FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
    ON public.automation_reviews FOR DELETE
    USING (user_id = auth.uid());

-- 3. feature_flags table
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view enabled feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;

-- Create policies for feature_flags
CREATE POLICY "Anyone can view enabled feature flags"
    ON public.feature_flags FOR SELECT
    USING (is_enabled = true);

CREATE POLICY "Admins can manage feature flags"
    ON public.feature_flags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'developer')
        )
    );

-- 4. automation_executions table
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own executions" ON public.automation_executions;
DROP POLICY IF EXISTS "Users can create executions" ON public.automation_executions;
DROP POLICY IF EXISTS "Automation owners can view executions" ON public.automation_executions;

-- Create policies for automation_executions
CREATE POLICY "Users can view their own executions"
    ON public.automation_executions FOR SELECT
    USING (executed_by = auth.uid());

CREATE POLICY "Users can create executions"
    ON public.automation_executions FOR INSERT
    WITH CHECK (executed_by = auth.uid());

CREATE POLICY "Automation owners can view executions"
    ON public.automation_executions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_executions.automation_id
            AND a.user_id = auth.uid()
        )
    );

-- 5. step_executions table
ALTER TABLE public.step_executions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view step executions for their executions" ON public.step_executions;
DROP POLICY IF EXISTS "Users can create step executions for their executions" ON public.step_executions;

-- Create policies for step_executions
CREATE POLICY "Users can view step executions for their executions"
    ON public.step_executions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.automation_executions ae
            WHERE ae.id = step_executions.execution_id
            AND (ae.executed_by = auth.uid() OR EXISTS (
                SELECT 1 FROM public.automations a
                WHERE a.id = ae.automation_id
                AND a.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can create step executions for their executions"
    ON public.step_executions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automation_executions ae
            WHERE ae.id = step_executions.execution_id
            AND ae.executed_by = auth.uid()
        )
    );