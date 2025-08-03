-- Supabase User Roles and Permissions Setup
-- Run this in your Supabase SQL Editor

-- Step 1: Update profiles table to include role and permissions
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'developer', 'super_admin')),
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_developer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS developer_access_granted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS developer_access_granted_by UUID REFERENCES auth.users(id);

-- Step 2: Create function to automatically set developer role for specific emails
CREATE OR REPLACE FUNCTION public.set_developer_role_for_email()
RETURNS TRIGGER AS $$
DECLARE
  developer_emails TEXT[] := ARRAY['marcminott@gmail.com']; -- Add more emails as needed
BEGIN
  -- Check if the user's email is in the developer list
  IF NEW.email = ANY(developer_emails) THEN
    -- Update the profile to grant developer access
    INSERT INTO public.profiles (id, email, role, permissions, is_developer, developer_access_granted_at)
    VALUES (
      NEW.id, 
      NEW.email, 
      'developer', 
      ARRAY['access_developer_tools', 'view_analytics', 'export_data'],
      TRUE,
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
      role = 'developer',
      permissions = ARRAY['access_developer_tools', 'view_analytics', 'export_data'],
      is_developer = TRUE,
      developer_access_granted_at = NOW();
  ELSE
    -- Create regular user profile
    INSERT INTO public.profiles (id, email, role, permissions)
    VALUES (NEW.id, NEW.email, 'user', ARRAY[]::TEXT[])
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to automatically set roles on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_set_role ON auth.users;
CREATE TRIGGER on_auth_user_created_set_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.set_developer_role_for_email();

-- Step 4: Update existing user to developer role (replace with your email)
UPDATE public.profiles 
SET 
  role = 'developer',
  permissions = ARRAY['access_developer_tools', 'view_analytics', 'export_data'],
  is_developer = TRUE,
  developer_access_granted_at = NOW()
WHERE email = 'marcminott@gmail.com';

-- Step 5: Create RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Developers can view all profiles" ON public.profiles;
CREATE POLICY "Developers can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.role = 'developer' OR p.role = 'super_admin')
    )
  );

-- Step 6: Create function to check user permissions
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions TEXT[];
  user_role TEXT;
BEGIN
  SELECT role, permissions INTO user_role, user_permissions
  FROM public.profiles
  WHERE id = user_id;
  
  -- Super admin has all permissions
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has specific permission
  RETURN permission_name = ANY(user_permissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create audit table for developer access changes
CREATE TABLE IF NOT EXISTS public.developer_access_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'granted', 'revoked', 'modified'
  old_role TEXT,
  new_role TEXT,
  old_permissions TEXT[],
  new_permissions TEXT[],
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on audit table
ALTER TABLE public.developer_access_audit ENABLE ROW LEVEL SECURITY;

-- Only developers and above can view audit logs
CREATE POLICY "Developers can view audit logs" ON public.developer_access_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.role = 'developer' OR p.role = 'super_admin')
    )
  );

-- Step 9: Create function to log developer access changes
CREATE OR REPLACE FUNCTION public.log_developer_access_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log changes to role or permissions
  IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.permissions IS DISTINCT FROM NEW.permissions) THEN
    INSERT INTO public.developer_access_audit (
      user_id,
      action,
      old_role,
      new_role,
      old_permissions,
      new_permissions,
      changed_by
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.role IS NULL THEN 'granted'
        WHEN NEW.role = 'user' AND OLD.role != 'user' THEN 'revoked'
        ELSE 'modified'
      END,
      OLD.role,
      NEW.role,
      OLD.permissions,
      NEW.permissions,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS log_developer_access_changes ON public.profiles;
CREATE TRIGGER log_developer_access_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_developer_access_change();

-- Step 10: Create helpful views for developers
CREATE OR REPLACE VIEW public.user_roles_summary AS
SELECT 
  p.id,
  p.email,
  p.role,
  p.permissions,
  p.is_developer,
  p.developer_access_granted_at,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.profiles dev 
  WHERE dev.id = auth.uid() 
  AND (dev.role = 'developer' OR dev.role = 'super_admin')
);

-- Grant necessary permissions
GRANT SELECT ON public.user_roles_summary TO authenticated;

-- Step 11: Insert or update your profile to ensure developer access
INSERT INTO public.profiles (id, email, role, permissions, is_developer, developer_access_granted_at)
SELECT 
  au.id,
  au.email,
  'developer',
  ARRAY['access_developer_tools', 'view_analytics', 'export_data'],
  TRUE,
  NOW()
FROM auth.users au
WHERE au.email = 'marcminott@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'developer',
  permissions = ARRAY['access_developer_tools', 'view_analytics', 'export_data'],
  is_developer = TRUE,
  developer_access_granted_at = COALESCE(public.profiles.developer_access_granted_at, NOW());

-- Verification queries (run these to check setup)
-- SELECT * FROM public.profiles WHERE email = 'marcminott@gmail.com';
-- SELECT * FROM public.user_roles_summary;
-- SELECT public.user_has_permission(auth.uid(), 'access_developer_tools');
-- SELECT public.get_user_role(auth.uid());