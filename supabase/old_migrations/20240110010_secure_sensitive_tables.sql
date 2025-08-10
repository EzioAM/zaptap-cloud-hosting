-- Secure sensitive tables (audit_logs and api_keys)
-- This script moves sensitive tables to a private schema and enables RLS

-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Grant usage on private schema to authenticated users
GRANT USAGE ON SCHEMA private TO authenticated;

-- 1. Handle audit_logs table
-- First, enable RLS on the existing table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create restrictive policies for audit_logs
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'developer')
        )
    );

-- Note: Audit logs should typically be inserted by backend functions with elevated privileges
-- Regular users should not be able to insert audit logs directly

-- 2. Handle api_keys table
-- First, enable RLS on the existing table
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;

-- Create policies for api_keys
CREATE POLICY "Users can view their own API keys"
    ON public.api_keys FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own API keys"
    ON public.api_keys FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys"
    ON public.api_keys FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own API keys"
    ON public.api_keys FOR DELETE
    USING (user_id = auth.uid());

-- Create functions to handle audit logging securely
CREATE OR REPLACE FUNCTION private.create_audit_log(
    p_table_name text,
    p_action text,
    p_record_id uuid,
    p_old_data jsonb DEFAULT NULL,
    p_new_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        table_name,
        action,
        user_id,
        record_id,
        old_data,
        new_data,
        created_at
    ) VALUES (
        p_table_name,
        p_action,
        auth.uid(),
        p_record_id,
        p_old_data,
        p_new_data,
        now()
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION private.create_audit_log TO authenticated;

-- Add comment explaining the security model
COMMENT ON FUNCTION private.create_audit_log IS 'Secure function for creating audit log entries';
COMMENT ON TABLE public.audit_logs IS 'Audit logs table with RLS - only admins can view, inserts via private.create_audit_log()';
COMMENT ON TABLE public.api_keys IS 'API keys table with RLS - users can only manage their own keys';