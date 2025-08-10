-- Rollback Script: Restore Original RLS Policies
-- Use this ONLY if the migration causes issues

-- ============================================
-- WARNING: This will restore the original (unoptimized) policies
-- Only use if absolutely necessary
-- ============================================

BEGIN;

-- Create a savepoint for safety
SAVEPOINT before_rollback;

-- ============================================
-- Restore original auth function calls (without SELECT wrapper)
-- ============================================

-- Restore users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Restore push_tokens policies
DROP POLICY IF EXISTS "Users can view own push tokens" ON public.push_tokens;
CREATE POLICY "Users can view own push tokens" ON public.push_tokens
  FOR SELECT USING (user_id = auth.uid());

-- Restore automations policies (separate policies instead of consolidated)
DROP POLICY IF EXISTS "Users can view automations" ON public.automations;

CREATE POLICY "Users can view own automations" ON public.automations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view public automations" ON public.automations
  FOR SELECT USING (is_public = true);

-- Add more restoration as needed...

-- ============================================
-- Verification after rollback
-- ============================================

DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'Rollback complete. Total policies: %', policy_count;
    
    -- Check if any policies still have the optimization
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND qual LIKE '%(select auth.uid())%'
    ) THEN
        RAISE WARNING 'Some policies still have optimization. Review manually.';
    END IF;
END;
$$;

-- Commit or rollback based on verification
-- COMMIT;  -- Uncomment to confirm rollback
-- ROLLBACK TO SAVEPOINT before_rollback;  -- Uncomment to cancel rollback